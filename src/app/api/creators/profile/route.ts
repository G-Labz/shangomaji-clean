import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hydrateCreatorProfile } from "@/lib/hydrate-creator-profile";

// Phase 1 — Creator Public Profile System.
//
// The fields below are creator-controlled and visible to the workspace UI.
// They include the public-control surface added in migration 020:
//   is_published_publicly, force_unpublished, force_unpublished_reason,
//   placeholder_quarantined, external_links, published_at.
//
// `force_unpublished` is admin-only — surfaced read-only here so the workspace
// can render the admin-imposed status banner. Creators cannot toggle it.
const PROFILE_COLUMNS =
  "display_name, handle, bio_short, bio_long, city, country, website, instagram, twitter, youtube, avatar_url, banner_url, " +
  "is_published_publicly, force_unpublished, force_unpublished_reason, " +
  "placeholder_quarantined, placeholder_quarantine_reason, external_links, " +
  "published_at, identity_status";

// Hard cap on external links the creator can publish. Anything beyond this is
// rejected at write time. Each link is { label, url } with a sane URL check.
const MAX_EXTERNAL_LINKS = 3;

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Lowercase, URL-safe handle. Allowed: a–z, 0–9, hyphen. Length 3–32.
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

function normalizeHandle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.replace(/^@+/, "").trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
}

type ExternalLink = { label: string; url: string };

function parseExternalLinks(input: unknown): { ok: true; value: ExternalLink[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "external_links must be an array." };
  }
  if (input.length > MAX_EXTERNAL_LINKS) {
    return { ok: false, error: `At most ${MAX_EXTERNAL_LINKS} external links are allowed.` };
  }
  const out: ExternalLink[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Each external link must be an object with label and url." };
    }
    const label = typeof (raw as any).label === "string" ? (raw as any).label.trim() : "";
    const urlRaw = typeof (raw as any).url === "string" ? (raw as any).url.trim() : "";
    if (!urlRaw) continue; // empty rows are dropped silently
    let urlNormalized = urlRaw;
    if (!/^https?:\/\//i.test(urlNormalized)) {
      urlNormalized = `https://${urlNormalized}`;
    }
    try {
      // Throws on invalid URL.
      // eslint-disable-next-line no-new
      new URL(urlNormalized);
    } catch {
      return { ok: false, error: `"${urlRaw}" is not a valid URL.` };
    }
    out.push({
      label: label.slice(0, 60),
      url:   urlNormalized.slice(0, 500),
    });
  }
  return { ok: true, value: out };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = user.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(PROFILE_COLUMNS)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fallback hydration. Covers older accepted creators whose profile row was
  // never populated. The helper only fills empty fields, so creator-edited
  // values are preserved. Service role used to bypass RLS and to read
  // creator_applications.
  if (!data) {
    const admin = svc();
    try {
      const result = await hydrateCreatorProfile(admin, email);
      if (result.ok && (result.created || result.updatedFields.length > 0)) {
        const { data: rehydrated, error: rehydrateErr } = await admin
          .from("creator_profiles")
          .select(PROFILE_COLUMNS)
          .eq("email", email)
          .maybeSingle();
        if (!rehydrateErr && rehydrated) {
          return NextResponse.json({ profile: rehydrated });
        }
      } else if (!result.ok) {
        console.error("Profile fallback hydration failed", {
          email,
          error: result.error,
        });
      }
    } catch (err: any) {
      console.error("Profile fallback hydration threw", {
        email,
        error: err?.message,
      });
    }
  }

  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = user.email.trim().toLowerCase();

  let body: Record<string, any>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Read existing row (if any) so we can validate publish/quarantine state.
  // Service role is used for the admin-only columns the creator does not own.
  const admin = svc();
  const { data: existing } = await admin
    .from("creator_profiles")
    .select(
      "id, email, handle, is_published_publicly, force_unpublished, placeholder_quarantined, published_at"
    )
    .eq("email", email)
    .maybeSingle();

  if (existing && (existing as any).placeholder_quarantined) {
    return NextResponse.json(
      {
        error:
          "This profile is under review and cannot be edited. Contact ShangoMaji support if you believe this is in error.",
      },
      { status: 422 }
    );
  }

  // ── Validate handle (creator-supplied, normalized).
  const newHandle = body.handle !== undefined ? normalizeHandle(body.handle) : null;
  if (body.handle !== undefined) {
    if (!newHandle) {
      return NextResponse.json(
        { error: "Handle is required." },
        { status: 422 }
      );
    }
    if (!HANDLE_RE.test(newHandle)) {
      return NextResponse.json(
        {
          error:
            "Handle must be 3–32 characters, lowercase letters, digits, or hyphens.",
        },
        { status: 422 }
      );
    }

    // Uniqueness — case-insensitive, scoped to non-quarantined rows.
    const { data: clash } = await admin
      .from("creator_profiles")
      .select("email")
      .ilike("handle", newHandle)
      .eq("placeholder_quarantined", false)
      .neq("email", email)
      .maybeSingle();
    if (clash) {
      return NextResponse.json(
        { error: "That handle is already taken." },
        { status: 409 }
      );
    }
  }

  // ── Validate external links.
  let externalLinks: ExternalLink[] | undefined;
  if (body.external_links !== undefined) {
    const parsed = parseExternalLinks(body.external_links);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }
    externalLinks = parsed.value;
  }

  // ── Resolve publish intent.
  // Creators can publish only when:
  //   - admin has not force-unpublished
  //   - the row is not quarantined (already checked above)
  //   - a handle is set (either incoming or already on the row)
  let publishIntent: boolean | undefined;
  if (body.is_published_publicly !== undefined) {
    const intent = body.is_published_publicly === true;
    if (intent) {
      if (existing && (existing as any).force_unpublished) {
        return NextResponse.json(
          {
            error:
              "Your profile has been unpublished by ShangoMaji and cannot be republished from the workspace.",
          },
          { status: 422 }
        );
      }
      const handleAfter = newHandle ?? (existing as any)?.handle ?? null;
      if (!handleAfter) {
        return NextResponse.json(
          { error: "Set a handle before publishing your profile." },
          { status: 422 }
        );
      }
    }
    publishIntent = intent;
  }

  // ── Build the update/insert payload.
  const now = new Date().toISOString();
  const profileData: Record<string, unknown> = {
    email,
    updated_at: now,
  };

  // Public-safe creator-owned fields.
  if (body.display_name !== undefined) profileData.display_name = body.display_name ?? null;
  if (body.handle !== undefined)        profileData.handle       = newHandle;
  if (body.bio_short !== undefined)     profileData.bio_short    = body.bio_short ?? null;
  if (body.bio_long !== undefined)      profileData.bio_long     = body.bio_long ?? null;
  if (body.city !== undefined)          profileData.city         = body.city ?? null;
  if (body.country !== undefined)       profileData.country      = body.country ?? null;
  if (body.website !== undefined)       profileData.website      = body.website ?? null;
  if (body.instagram !== undefined)     profileData.instagram    = body.instagram ?? null;
  if (body.twitter !== undefined)       profileData.twitter      = body.twitter ?? null;
  if (body.youtube !== undefined)       profileData.youtube      = body.youtube ?? null;
  if (body.avatar_url !== undefined)    profileData.avatar_url   = body.avatar_url ?? null;
  if (body.banner_url !== undefined)    profileData.banner_url   = body.banner_url ?? null;

  if (externalLinks !== undefined) profileData.external_links = externalLinks;

  if (publishIntent !== undefined) {
    profileData.is_published_publicly = publishIntent;
    if (publishIntent && !(existing as any)?.published_at) {
      profileData.published_at = now;
    }
  }

  let result;
  if (existing) {
    result = await admin
      .from("creator_profiles")
      .update(profileData)
      .eq("email", email);
  } else {
    // First write also stamps the published_at if the creator publishes
    // immediately on first save.
    if (publishIntent === true) profileData.published_at = now;
    result = await admin.from("creator_profiles").insert(profileData);
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
