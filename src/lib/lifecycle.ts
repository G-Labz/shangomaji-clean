// Lifecycle Control System v1 — shared state-transition helper.
//
// Single source of truth for valid lifecycle transitions on creator_projects.
// Used by both /api/admin/projects and /api/creators/projects so the state
// machine cannot be circumvented from one route while enforced in the other.
//
// Invalid transitions are rejected here; valid transitions return an `updates`
// payload that the caller writes to the row alongside whatever side-effects
// (license stamping, Bunny cascade, email) it owns.

export type ProjectStatus =
  | "draft"
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "live"
  | "archived"
  | "removal_requested"
  | "removed";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "pending",
  "in_review",
  "approved",
  "rejected",
  "live",
  "archived",
  "removal_requested",
  "removed",
] as const;

// Terminal states. No transitions are permitted out of these. "removed"
// is the institutional removal outcome and is permanently locked; "archived"
// is reversible only via planRestore (which targets the previous state, not
// via the actor map).
export const TERMINAL_STATUSES: readonly ProjectStatus[] = ["removed"] as const;

// Authority of each transition. "system" is reserved for internal moves
// triggered by side-effects (none today); creator and admin are the two
// human-driven actors in the system.
export type Actor = "admin" | "creator" | "system";

// Source-state → set of legal target states for this actor.
const CREATOR_ALLOWED: Record<string, ReadonlySet<ProjectStatus>> = {
  draft: new Set<ProjectStatus>(["pending"]),
  live:  new Set<ProjectStatus>(["removal_requested"]),
};

const ADMIN_ALLOWED: Record<string, ReadonlySet<ProjectStatus>> = {
  pending:           new Set<ProjectStatus>(["in_review", "approved", "rejected", "archived"]),
  in_review:         new Set<ProjectStatus>(["approved", "rejected", "archived"]),
  approved:          new Set<ProjectStatus>(["live", "archived"]),
  rejected:          new Set<ProjectStatus>(["in_review", "archived"]),
  live:              new Set<ProjectStatus>(["archived"]),
  // Removal outcome is "removed" (terminal), not "archived". Denial returns
  // the work to "live". This is the load-bearing change of migration 018:
  // archive is no longer a removal outcome.
  removal_requested: new Set<ProjectStatus>(["removed", "live"]),
  // archived → previous_status_before_archive is handled by planRestore
  // because the target depends on the row, not a static map.
  // removed: intentionally absent — terminal.
};

export type StateHistoryEntry = {
  from: string;
  to: string;
  by: Actor;
  at: string;            // ISO timestamp
  reason: string | null;
};

export type LifecycleRow = {
  status: string;
  state_history?: unknown;
  previous_status_before_archive?: string | null;
};

export type TransitionInput = {
  row: LifecycleRow;
  to: ProjectStatus;
  by: Actor;
  reason?: string | null;
};

export type TransitionOk = {
  ok: true;
  from: ProjectStatus;
  to: ProjectStatus;
  updates: Record<string, unknown>;
  historyEntry: StateHistoryEntry;
};

export type TransitionErr = {
  ok: false;
  error: string;
  status: number; // HTTP status hint
};

export type TransitionResult = TransitionOk | TransitionErr;

function readHistory(value: unknown): StateHistoryEntry[] {
  if (Array.isArray(value)) return value as StateHistoryEntry[];
  return [];
}

function isValidStatus(s: string): s is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(s);
}

function allowedFor(actor: Actor, from: string): ReadonlySet<ProjectStatus> {
  if (actor === "creator") return CREATOR_ALLOWED[from] ?? new Set();
  if (actor === "admin")   return ADMIN_ALLOWED[from]   ?? new Set();
  return new Set();
}

// Build the update payload + history entry for a given transition. The caller
// is responsible for issuing the actual UPDATE and any side-effects.
//
// On entry into "archived" the prior status is stamped to
// previous_status_before_archive so a future restore can target it.
//
// `updated_at` is set; `status_changed_at` is also set so legacy panels that
// read it stay accurate.
export function planTransition(input: TransitionInput): TransitionResult {
  const { row, to, by } = input;
  const reason = (input.reason ?? "").trim() || null;
  const from = row.status;

  if (!isValidStatus(from)) {
    return { ok: false, error: `Current status "${from}" is not a recognized state.`, status: 422 };
  }
  if (!isValidStatus(to)) {
    return { ok: false, error: `Target status "${to}" is not a recognized state.`, status: 422 };
  }
  if (from === to) {
    return { ok: false, error: `Already in state "${from}".`, status: 422 };
  }

  if ((TERMINAL_STATUSES as readonly string[]).includes(from)) {
    return {
      ok: false,
      error: `"${from}" is a terminal state. No transitions are permitted.`,
      status: 422,
    };
  }

  const allowed = allowedFor(by, from);
  if (!allowed.has(to)) {
    return {
      ok: false,
      error: `Transition "${from}" → "${to}" is not permitted for ${by}.`,
      status: 422,
    };
  }

  const now = new Date().toISOString();
  const entry: StateHistoryEntry = { from, to, by, at: now, reason };
  const history = readHistory(row.state_history);

  const updates: Record<string, unknown> = {
    status:            to,
    updated_at:        now,
    status_changed_at: now,
    state_history:     [...history, entry],
  };

  if (to === "archived") {
    // Stamp the pre-archive state so a restore knows where to return.
    // Do not stamp when archiving from removal_requested with no recoverable
    // pre-state — but in practice removal_requested came from live, and the
    // institutional outcome of an approved removal is "archived, do not
    // restore." We still stamp `removal_requested` here so the audit shows
    // the immediate prior state honestly; restore from archived after a
    // removal-approve archive is therefore disallowed by the restore plan
    // (target would be `removal_requested`, which is not a legal restore
    // target). Admin can manually flip back via the live-restore path if
    // they truly want to undo.
    updates.previous_status_before_archive = from;
  }

  return { ok: true, from: from as ProjectStatus, to, updates, historyEntry: entry };
}

// Restore is special: target status is the row's previous_status_before_archive.
// Returns a TransitionErr if the row has no recoverable previous state.
export function planRestore(input: { row: LifecycleRow; by: Actor; reason?: string | null }): TransitionResult {
  const { row, by } = input;
  if (row.status !== "archived") {
    return {
      ok: false,
      error: `Restore is only valid from "archived". Current state is "${row.status}".`,
      status: 422,
    };
  }
  const target = (row.previous_status_before_archive ?? "").trim();
  if (!target) {
    return {
      ok: false,
      error: "Cannot restore because no previous state is recorded.",
      status: 422,
    };
  }
  // Restore can only land on a non-archived, non-removal-requested,
  // non-removed state and must be a recognized status.
  if (
    !isValidStatus(target) ||
    target === "archived" ||
    target === "removal_requested" ||
    target === "removed"
  ) {
    return {
      ok: false,
      error: `Cannot restore: previous state "${target}" is not a valid restore target.`,
      status: 422,
    };
  }

  const planned = planTransitionToTarget({
    row,
    to: target as ProjectStatus,
    by,
    reason: input.reason ?? null,
    bypassActorMap: true, // restore is admin-only and doesn't follow the normal map
  });
  if (!planned.ok) return planned;

  // Clear the marker so a subsequent re-archive→restore cycle starts fresh.
  planned.updates.previous_status_before_archive = null;
  return planned;
}

// Internal — used by planRestore to bypass the actor map (restore's source
// is `archived` which has no entries in either map). Caller must already
// validate the actor is admin.
function planTransitionToTarget(args: {
  row: LifecycleRow;
  to: ProjectStatus;
  by: Actor;
  reason: string | null;
  bypassActorMap: boolean;
}): TransitionResult {
  const { row, to, by, reason, bypassActorMap } = args;
  const from = row.status;
  if (!isValidStatus(from)) {
    return { ok: false, error: `Current status "${from}" is not a recognized state.`, status: 422 };
  }
  if (!bypassActorMap) {
    return planTransition({ row, to, by, reason });
  }
  const now = new Date().toISOString();
  const entry: StateHistoryEntry = { from, to, by, at: now, reason: reason || null };
  const history = readHistory(row.state_history);
  return {
    ok: true,
    from: from as ProjectStatus,
    to,
    historyEntry: entry,
    updates: {
      status:            to,
      updated_at:        now,
      status_changed_at: now,
      state_history:     [...history, entry],
    },
  };
}

// Convenience: append a history entry to an updates payload that already
// carries a status. Useful when callers need to compose their own updates
// (e.g. /api/admin/projects approval gate enforces extra fields, then plans
// the transition).
export function appendHistory(
  current: unknown,
  entry: StateHistoryEntry
): StateHistoryEntry[] {
  return [...readHistory(current), entry];
}
