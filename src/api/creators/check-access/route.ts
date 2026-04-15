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

    const { data, error } = await supabase
      .from("creator_applications")
      .select("id, name, handle, status, approved_creator")
      .eq("email", normalizedEmail)
      .maybeSingle();

    console.log("CHECK_ACCESS_DEBUG", { normalizedEmail, data, error });

    if (error || !data) {
      return NextResponse.json({
        approved: false,
        debug: {
          step: "no_data_or_error",
          normalizedEmail,
          error: error?.message ?? null,
          data: data ?? null,
        },
      });
    }

    if (!data.approved_creator || data.status.toLowerCase().trim() !== "accepted") {
      return NextResponse.json({
        approved: false,
        debug: {
          step: "failed_status_or_creator_check",
          normalizedEmail,
          approved_creator: data.approved_creator,
          status: data.status,
        },
      });
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