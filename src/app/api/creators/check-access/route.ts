import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

const { data: rows, error } = await supabase
  .from("creator_applications")
  .select("id, name, handle, status, approved_creator")
  .eq("email", normalizedEmail)
  .eq("status", "accepted")
  .limit(1);

const data = rows?.[0] ?? null;

if (error || !data) {
  return NextResponse.json({ approved: false });
}

    return NextResponse.json({
      approved: true,
      creator: {
        id: data.id,
        name: data.name,
        handle: data.handle,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
