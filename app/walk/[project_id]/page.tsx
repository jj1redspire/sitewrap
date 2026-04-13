"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, ArrowLeft, RotateCcw, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TranscribePunchlistResult } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordingStatus = "idle" | "recording" | "processing" | "done";

interface StructuredItem {
  number: number;
  room: string;
  description: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  assigned_trade?: string;
}


// ─── Waveform visualizer ───────────────────────────────────────────────────────

function Waveform() {
  return (
    <div className="flex items-center justify-center gap-1 h-10" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-[#EA580C] wave-bar"
          style={{ animationDelay: `${(i - 1) * 0.12}s` }}
        />
      ))}
    </div>
  );
}

// ─── Format timer ─────────────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Done state — editable items ──────────────────────────────────────────────

function DoneState({
  projectId,
  items: initialItems,
  onRecordMore,
}: {
  projectId: string;
  items: StructuredItem[];
  onRecordMore: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<StructuredItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Group by room
  const grouped = items.reduce<Record<string, StructuredItem[]>>((acc, item) => {
    const room = item.room || "Unassigned";
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {});

  function updateItem(idx: number, patch: Partial<StructuredItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  // Find original index of item in flat list by room iteration order
  function getOriginalIndex(room: string, posInRoom: number): number {
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      if ((items[i].room || "Unassigned") === room) {
        if (count === posInRoom) return i;
        count++;
      }
    }
    return -1;
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/save-punchlist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, items }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(`/project/${projectId}`);
    } catch {
      setError("Failed to save items. Please try again.");
      setSaving(false);
    }
  }

  const uniqueRooms = Array.from(new Set(items.map((i) => i.room || "Unassigned")));

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36">
        {/* Summary */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
          <p className="font-semibold text-green-800">
            {items.length} item{items.length !== 1 ? "s" : ""} structured
          </p>
          <p className="text-sm text-green-600 mt-0.5">
            Review and edit below, then save to the project.
          </p>
        </div>

        {Object.entries(grouped).map(([room, roomItems]) => (
          <div key={room} className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 px-1">
              {room}
            </h3>
            <div className="flex flex-col gap-3">
              {roomItems.map((item, posInRoom) => {
                const origIdx = getOriginalIndex(room, posInRoom);
                return (
                  <div
                    key={origIdx}
                    className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {item.number}
                      </span>
                      {/* Severity selector */}
                      <select
                        value={item.severity}
                        onChange={(e) =>
                          updateItem(origIdx, {
                            severity: e.target.value as StructuredItem["severity"],
                          })
                        }
                        className={`rounded px-2 py-1 text-xs font-bold uppercase text-white border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#EA580C] ${
                          item.severity === "CRITICAL"
                            ? "bg-red-600"
                            : item.severity === "MAJOR"
                            ? "bg-amber-500"
                            : "bg-green-600"
                        }`}
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="MAJOR">MAJOR</option>
                        <option value="MINOR">MINOR</option>
                      </select>
                    </div>

                    {/* Description */}
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(origIdx, { description: e.target.value })}
                      rows={2}
                      className="w-full text-sm font-medium text-[#1C1917] border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-none mb-2"
                    />

                    {/* Room selector */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-stone-400 mb-0.5 block">Room</label>
                        <input
                          type="text"
                          value={item.room}
                          onChange={(e) => updateItem(origIdx, { room: e.target.value })}
                          list={`rooms-${origIdx}`}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                        />
                        <datalist id={`rooms-${origIdx}`}>
                          {uniqueRooms.map((r) => (
                            <option key={r} value={r} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#EA580C] text-white rounded-2xl py-4 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg min-h-[52px]"
        >
          <Save size={20} />
          {saving ? "Saving..." : "Save to Project"}
        </button>
        <button
          onClick={onRecordMore}
          className="w-full border border-stone-200 text-stone-700 rounded-2xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 min-h-[52px]"
        >
          <Mic size={18} />
          Add More Items
        </button>
      </div>
    </div>
  );
}

// ─── Main walk page ────────────────────────────────────────────────────────────

export default function WalkPage({ params }: { params: { project_id: string } }) {
  const router = useRouter();
  const { project_id } = params;

  const [projectName, setProjectName] = useState<string>("Loading...");
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [structuredItems, setStructuredItems] = useState<StructuredItem[]>([]);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch project name
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .single()
      .then(({ data }) => {
        if (data?.name) setProjectName(data.name);
      });
  }, [project_id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    setTimerSeconds(0);
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        await processAudio(blob);
      };

      recorder.start(250); // Collect data every 250ms
      setStatus("recording");
      startTimer();
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access and try again."
          : "Could not start recording. Please check your microphone."
      );
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    setStatus("processing");
  }

  async function processAudio(blob: Blob) {
    setStatus("processing");
    setError("");
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("project_id", project_id);

      const res = await fetch("/api/transcribe-punchlist", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Transcription failed");
      }

      const result: TranscribePunchlistResult = await res.json();
      setStructuredItems(result.items as StructuredItem[]);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setStatus("idle");
    }
  }

  function handleRecordMore() {
    setStructuredItems([]);
    setStatus("idle");
    setError("");
  }

  // ─── Done state ───────────────────────────────────────────────────────────

  if (status === "done") {
    return (
      <DoneState
        projectId={project_id}
        items={structuredItems}
        onRecordMore={handleRecordMore}
      />
    );
  }

  // ─── Main recording UI ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-stone-100">
        <button
          onClick={() => router.push(`/project/${project_id}`)}
          className="p-2 -ml-1 text-stone-500 hover:text-stone-800 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Walk</p>
          <p className="font-semibold text-[#1C1917] truncate">{projectName}</p>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {status === "idle" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1C1917] mb-2">Ready to walk</h2>
              <p className="text-stone-500 text-sm max-w-xs">
                Speak naturally. Describe each punch item by room — we&apos;ll structure it automatically.
              </p>
            </div>

            {error && (
              <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Record button */}
            <button
              onClick={startRecording}
              className="w-24 h-24 bg-[#EA580C] rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-orange-700 active:scale-95 transition-all"
              aria-label="Start recording"
            >
              <Mic size={40} />
            </button>

            <p className="text-stone-400 text-sm font-medium">Tap to start recording</p>
          </>
        )}

        {status === "recording" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1C1917] mb-1">Recording...</h2>
              <p className="text-stone-500 text-sm">Speak clearly. Tap stop when done.</p>
            </div>

            {/* Timer */}
            <div className="text-4xl font-mono font-bold text-[#1C1917] tabular-nums">
              {formatTimer(timerSeconds)}
            </div>

            {/* Waveform */}
            <Waveform />

            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="w-24 h-24 bg-[#EA580C] rounded-full record-pulse shadow-2xl flex items-center justify-center text-white hover:bg-orange-700 active:scale-95 transition-all"
              aria-label="Stop recording"
            >
              <Square size={32} fill="white" />
            </button>

            <p className="text-stone-400 text-sm font-medium">Tap to stop</p>
          </>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="w-16 h-16 border-4 border-stone-200 border-t-[#EA580C] rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-[#1C1917] text-lg">Structuring your punch list...</p>
              <p className="text-stone-400 text-sm mt-1">This usually takes 10–20 seconds</p>
            </div>

            {/* Skeleton */}
            <div className="w-full max-w-sm flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-stone-100 rounded-2xl animate-pulse"
                  style={{ opacity: 1 - i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint for recording state */}
      {status === "recording" && (
        <div className="pb-safe-bottom pb-8 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-stone-400 text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording in progress
          </div>
        </div>
      )}

      {/* Try again button if error in non-idle state */}
      {error && status !== "idle" && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
          <button
            onClick={() => { setStatus("idle"); setError(""); }}
            className="w-full flex items-center justify-center gap-2 border border-stone-200 text-stone-600 rounded-xl py-3 text-sm font-semibold"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
