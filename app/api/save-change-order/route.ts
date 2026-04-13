import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LineItem } from "@/types";

interface SaveChangeOrderBody {
  project_id: string;
  description: string;
  requested_by: string;
  line_items: LineItem[];
  total_cost: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: SaveChangeOrderBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { project_id, description, requested_by, line_items, total_cost, notes } = body;

    if (!project_id || !description || !requested_by || !line_items) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: project_id, description, requested_by, line_items",
        },
        { status: 400 }
      );
    }

    if (typeof total_cost !== "number") {
      return NextResponse.json(
        { error: "total_cost must be a number" },
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

    // 4. Insert change order
    const { data: changeOrder, error: insertError } = await supabase
      .from("change_orders")
      .insert({
        project_id,
        description,
        requested_by,
        line_items,
        total_cost,
        notes: notes ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !changeOrder) {
      console.error("Change order insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save change order" },
        { status: 500 }
      );
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      id: changeOrder.id,
    });
  } catch (error) {
    console.error("Save change order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
