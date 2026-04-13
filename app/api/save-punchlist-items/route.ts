import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TranscribePunchlistResult } from "@/types";

interface SavePunchlistItemsBody {
  project_id: string;
  items: TranscribePunchlistResult["items"];
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: SavePunchlistItemsBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { project_id, items } = body;

    if (!project_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Missing required fields: project_id and items" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Items array must not be empty" },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // 4. Insert punch items
    const rows = items.map((item) => ({
      project_id,
      item_number: item.number,
      room: item.room,
      description: item.description,
      severity: item.severity.toLowerCase() as "critical" | "major" | "minor",
      status: "open" as const,
      assigned_trade: item.assigned_trade ?? null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("punch_items")
      .insert(rows)
      .select("id");

    if (insertError) {
      console.error("Punch items insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save punch list items" },
        { status: 500 }
      );
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      count: inserted?.length ?? rows.length,
    });
  } catch (error) {
    console.error("Save punchlist items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
