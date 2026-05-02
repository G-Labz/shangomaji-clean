// Creator profile hydration from creator_applications.
//
// A creator who has been accepted (and onboarded) should not have to re-enter
// the identity data they already submitted. This module finds (or creates)
// the matching creator_profiles row and fills empty fields from the
// application.
//
// Strict rules:
//   - Never overwrite a non-empty profile field. Existing creator edits win.
//   - Never invent data. If a source field is missing or blank, leave the
//     profile field as-is (or null on first create).
//   - Never put project metadata (project_title, logline, etc.) into identity
//     fields. Those columns are intentionally left out of the mapping.
//   - Email is the join key. It is normalized (trim + lowercase) before any
//     read or write.
//   - Service-role-only. RLS policies on creator_profiles allow public
//     SELECT/INSERT/UPDATE in the current schema, but hydration is a
//     server-side operation tied to a verified onboarding/auth event, so we
//     consistently use service role to keep the path immune to future RLS
//     tightening.

import type { SupabaseClient } from "@supabase/supabase-js";

export type HydrateProfileResult =
  | { ok: true; created: boolean; updatedFields: string[] }
  | { ok: false; error: string };

type ApplicationRow = {
  id: string;
  email: string;
  name: string | null;
  // Structured identity (migration 014). May be null on legacy applications.
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  handle: string | null;
  origin: string | null;
  influences: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  website: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  handle: string | null;
  bio_short: string | null;
  bio_long: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  application_id: string | null;
  hydrated_from_application_at: string | null;
  // Identity Enforcement v1 (migration 015). Default 'self_certified' is
  // applied by the DB on insert; we set it explicitly on first hydration
  // and never overwrite an existing value.
  identity_status: string | null;
};

// Prefer structured first+last when both are present; fall back to legacy
// `name`. Returns null if neither yields a usable string.
function deriveDisplayName(app: ApplicationRow): string | null {
  const first = clean(app.first_name);
  const last  = clean(app.last_name);
  if (first && last) return `${first} ${last}`;
  return clean(app.name);
}

// Profile schema has city + country but no region. When structured city is
// present, fold region into city for display ("Lagos, Lagos State"). Falls
// back to legacy `origin` when no structured city was captured.
function deriveCityForProfile(app: ApplicationRow): string | null {
  const city   = clean(app.city);
  const region = clean(app.region);
  if (city) return region ? `${city}, ${region}` : city;
  return clean(app.origin);
}

function clean(s: string | null | undefined): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEmpty(s: string | null | undefined): boolean {
  return !(typeof s === "string" && s.trim().length > 0);
}

function normalizeHandle(s: string | null | undefined): string | null {
  const c = clean(s);
  if (!c) return null;
  return c.replace(/^@+/, "").trim() || null;
}

// Pick the freshest accepted application for an email. Falls back to the
// freshest non-accepted record only if no accepted exists — but we never call
// this from a non-accepted context. Returns null if no row exists.
export async function findApplicationForEmail(
  admin: SupabaseClient,
  email: string
): Promise<ApplicationRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await admin
    .from("creator_applications")
    .select(
      "id, email, name, first_name, last_name, city, region, country, handle, origin, influences, instagram, twitter, youtube, website, status, submitted_at"
    )
    .ilike("email", normalized)
    .order("submitted_at", { ascending: false });

  if (error || !data || data.length === 0) return null;

  const accepted = (data as any[]).find((a) => a.status === "accepted");
  const chosen = accepted ?? data[0];
  return {
    id:         chosen.id,
    email:      chosen.email,
    name:       chosen.name,
    first_name: chosen.first_name ?? null,
    last_name:  chosen.last_name ?? null,
    city:       chosen.city ?? null,
    region:     chosen.region ?? null,
    country:    chosen.country ?? null,
    handle:     chosen.handle,
    origin:     chosen.origin,
    influences: chosen.influences,
    instagram:  chosen.instagram,
    twitter:    chosen.twitter,
    youtube:    chosen.youtube,
    website:    chosen.website,
  };
}

// Create or fill a creator_profiles row from a creator_applications row.
//
// Behavior:
//   - If no profile exists, INSERT one populated from the application.
//   - If a profile exists, UPDATE only the columns that are currently
//     null/empty. Non-empty creator-edited fields are preserved.
//   - The application_id / hydrated_from_application_at trace columns are
//     filled when missing and never overwritten once set.
export async function hydrateCreatorProfile(
  admin: SupabaseClient,
  email: string,
  application?: ApplicationRow | null
): Promise<HydrateProfileResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Email is required for profile hydration." };
  }

  const app = application ?? (await findApplicationForEmail(admin, normalizedEmail));

  // No application data → nothing to hydrate from. We do NOT create a blank
  // profile; the existing POST /api/creators/profile flow handles manual
  // creation when the creator first edits.
  if (!app) {
    return { ok: true, created: false, updatedFields: [] };
  }

  const { data: existing, error: existingErr } = await admin
    .from("creator_profiles")
    .select(
      "id, email, display_name, handle, bio_short, bio_long, city, country, website, instagram, twitter, youtube, avatar_url, banner_url, application_id, hydrated_from_application_at, identity_status"
    )
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingErr) {
    return { ok: false, error: existingErr.message };
  }

  const now = new Date().toISOString();

  // Source values from the application, normalized.
  // Identity prefers the structured first+last over legacy `name`.
  // Location prefers structured city (combined with region) + country
  // over the legacy single-field `origin`.
  const srcDisplayName = deriveDisplayName(app);
  const srcHandle      = normalizeHandle(app.handle);
  const srcCity        = deriveCityForProfile(app);
  const srcCountry     = clean(app.country);
  const srcBioLong     = clean(app.influences);      // influences → bio_long (creator's own words)
  const srcInstagram   = clean(app.instagram);
  const srcTwitter     = clean(app.twitter);
  const srcYoutube     = clean(app.youtube);
  const srcWebsite     = clean(app.website);

  if (!existing) {
    const insertRow: Partial<ProfileRow> & { email: string } = {
      email:        normalizedEmail,
      display_name: srcDisplayName,
      handle:       srcHandle,
      bio_long:     srcBioLong,
      city:         srcCity,
      country:      srcCountry,
      website:      srcWebsite,
      instagram:    srcInstagram,
      twitter:      srcTwitter,
      youtube:      srcYoutube,
      application_id: app.id,
      hydrated_from_application_at: now,
      // Identity floor for any newly-created profile. Aligns with the
      // self-certification copy on the license execution page. Higher tiers
      // are set by ShangoMaji ops, never by hydration.
      identity_status: "self_certified",
    };

    const { error: insertErr } = await admin
      .from("creator_profiles")
      .insert(insertRow);

    if (insertErr) {
      // Race: a parallel hydration may have inserted the row between our
      // SELECT and INSERT. Fall through to the update path on unique
      // violation; everything else is a real error.
      if (!/duplicate key|unique/i.test(insertErr.message)) {
        return { ok: false, error: insertErr.message };
      }
    } else {
      const created: string[] = [];
      for (const [k, v] of Object.entries(insertRow)) {
        if (k !== "email" && v != null) created.push(k);
      }
      return { ok: true, created: true, updatedFields: created };
    }
  }

  // Update path — fill only empty fields, never overwrite.
  const current = (existing ?? (await admin
    .from("creator_profiles")
    .select(
      "id, email, display_name, handle, bio_short, bio_long, city, country, website, instagram, twitter, youtube, avatar_url, banner_url, application_id, hydrated_from_application_at, identity_status"
    )
    .eq("email", normalizedEmail)
    .maybeSingle()).data) as ProfileRow | null;

  if (!current) {
    return { ok: true, created: false, updatedFields: [] };
  }

  const updates: Record<string, unknown> = {};
  const fillIfEmpty = (col: keyof ProfileRow, value: string | null) => {
    if (value && isEmpty(current[col] as string | null)) {
      updates[col as string] = value;
    }
  };

  fillIfEmpty("display_name", srcDisplayName);
  fillIfEmpty("handle",       srcHandle);
  fillIfEmpty("bio_long",     srcBioLong);
  fillIfEmpty("city",         srcCity);
  fillIfEmpty("country",      srcCountry);
  fillIfEmpty("website",      srcWebsite);
  fillIfEmpty("instagram",    srcInstagram);
  fillIfEmpty("twitter",      srcTwitter);
  fillIfEmpty("youtube",      srcYoutube);

  // Trace columns: only stamp if not already stamped.
  if (!current.application_id) {
    updates.application_id = app.id;
  }
  if (!current.hydrated_from_application_at) {
    updates.hydrated_from_application_at = now;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, created: false, updatedFields: [] };
  }

  updates.updated_at = now;

  const { error: updateErr } = await admin
    .from("creator_profiles")
    .update(updates)
    .eq("email", normalizedEmail);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  return {
    ok: true,
    created: false,
    updatedFields: Object.keys(updates).filter((k) => k !== "updated_at"),
  };
}
