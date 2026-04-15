import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("email", normalizedEmail)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Profile fetch failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = body.email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("creator_profiles")
    .upsert(
      { ...body, email: normalizedEmail, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("Profile upsert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
