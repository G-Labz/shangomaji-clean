import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  validateNamePart,
  validateCity,
  validateRegion,
  validateCountry,
  composeFullName,
  composeOrigin,
  type FieldError,
} from "@/lib/creator-identity";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Strict 422 helper — returns the first failing field with the user-facing
// message. Identity validation is the gate; we do not silently fall back to
// the legacy single fields when structured fields are missing.
function reject(error: FieldError) {
  return NextResponse.json(
    { error: error.message, field: error.field },
    { status: 422 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Identity (strict) ────────────────────────────────────────────────
    const firstNameRes = validateNamePart(body.firstName, "first_name");
    if (!firstNameRes.ok) return reject(firstNameRes.error);

    const lastNameRes = validateNamePart(body.lastName, "last_name");
    if (!lastNameRes.ok) return reject(lastNameRes.error);

    const cityRes = validateCity(body.city);
    if (!cityRes.ok) return reject(cityRes.error);

    const regionRes = validateRegion(body.region);
    if (!regionRes.ok) return reject(regionRes.error);

    const countryRes = validateCountry(body.country);
    if (!countryRes.ok) return reject(countryRes.error);

    const firstName = firstNameRes.value;
    const lastName  = lastNameRes.value;
    const city      = cityRes.value;
    const region    = regionRes.value;
    const country   = countryRes.value;

    // Compose legacy fields so existing consumers (admin list, license fallback,
    // public catalog credit, current hydration mappers) keep working without
    // schema-conditional reads.
    const composedName   = composeFullName(firstName, lastName);
    const composedOrigin = composeOrigin(city, region, country);

    // ── Other required fields (existing behavior preserved) ─────────────
    const handle = typeof body.handle === "string" ? body.handle.trim() : "";
    const email  = typeof body.email  === "string" ? body.email.trim().toLowerCase() : "";

    if (!handle) {
      return NextResponse.json({ error: "Handle is required.", field: "handle" }, { status: 422 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required.", field: "email" }, { status: 422 });
    }

    const { error } = await supabase.from("creator_applications").insert([
      {
        // Structured identity (new)
        first_name: firstName,
        last_name:  lastName,
        city,
        region,
        country,

        // Legacy mirrored fields (kept populated for backward compatibility)
        name:   composedName,
        origin: composedOrigin,

        handle,
        email,
        project_title: body.projectTitle,
        project_type:  body.projectType,
        genres:        body.genres,
        logline:       body.logline,
        sample_url:    body.sampleUrl,
        influences:    body.influences,
        why_shangomaji: body.whyShangoMaji,
        what_you_need:  body.whatYouNeed,
        instagram:      body.instagram,
        twitter:        body.twitter,
        youtube:        body.youtube,
        website:        body.website,
        status:         "pending",
        submitted_at:   new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
