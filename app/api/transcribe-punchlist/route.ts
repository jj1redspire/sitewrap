import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { TranscribePunchlistResult } from "@/types";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }); }
function getAnthropic() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }); }

const PUNCHLIST_SYSTEM_PROMPT = `You are an expert construction punch list processor. You receive a raw audio transcript from a site walkthrough and must structure it into a precise punch list JSON object.

Your output must be valid JSON with this exact schema:
{
  "items": [
    {
      "number": 1,
      "room": "string (room or area name)",
      "description": "string (clear, actionable description of the deficiency)",
      "severity": "CRITICAL | MAJOR | MINOR",
      "assigned_trade": "string or null (e.g. Electrical, Plumbing, Drywall, Paint, etc.)"
    }
  ],
  "room_summary": {
    "Room Name": <count of items in that room>
  },
  "total_items": <number>,
  "critical_count": <number>,
  "major_count": <number>,
  "minor_count": <number>
}

Severity guidelines:
- CRITICAL: Safety hazard, structural issue, or code violation requiring immediate action
- MAJOR: Significant deficiency that must be resolved before final acceptance
- MINOR: Cosmetic or minor issue that should be corrected but is not blocking

Rules:
- Number items sequentially starting at 1
- Clean up verbal filler words and false starts
- Infer the room from context if not explicitly stated
- Infer the trade from the type of work (electrical fixtures → Electrical, pipes → Plumbing, etc.)
- Return ONLY valid JSON — no markdown, no explanation, no code fences`;

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;
    const project_id = formData.get("project_id") as string | null;

    if (!audio || !project_id) {
      return NextResponse.json(
        { error: "Missing required fields: audio and project_id" },
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

    // 3. Upload audio to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `${user.id}/${project_id}/${timestamp}.webm`;
    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("walkthroughs")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload audio file" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("walkthroughs")
      .getPublicUrl(storagePath);
    const audioUrl = urlData.publicUrl;

    // 4. Transcribe with OpenAI Whisper
    const audioFile = new File([audioBuffer], `${timestamp}.webm`, {
      type: "audio/webm",
    });

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const transcript = transcription.text;

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 422 }
      );
    }

    // 5. Structure transcript with Claude
    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: PUNCHLIST_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Please structure the following site walkthrough transcript into a punch list:\n\n${transcript}`,
        },
      ],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format from AI" },
        { status: 500 }
      );
    }

    let structured: TranscribePunchlistResult;
    try {
      structured = JSON.parse(rawContent.text) as TranscribePunchlistResult;
    } catch {
      console.error("Failed to parse Claude response:", rawContent.text);
      return NextResponse.json(
        { error: "Failed to parse structured data from AI response" },
        { status: 500 }
      );
    }

    // 6. Save walkthrough record to Supabase
    const { error: walkthroughError } = await supabase
      .from("walkthroughs")
      .insert({
        project_id,
        audio_url: audioUrl,
        transcript,
        type: "punchlist",
        processed_at: new Date().toISOString(),
      });

    if (walkthroughError) {
      console.error("Walkthrough insert error:", walkthroughError);
      // Non-fatal — return structured data even if save fails
    }

    // 7. Return structured data
    return NextResponse.json(structured);
  } catch (error) {
    console.error("Transcribe punchlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
