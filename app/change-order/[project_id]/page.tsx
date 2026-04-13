"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, ArrowLeft, RotateCcw, Plus, Trash2, Send, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LineItem, TranscribeChangeOrderResult } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordingStatus = "idle" | "recording" | "processing" | "done";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

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

// ─── Signature Modal ───────────────────────────────────────────────────────────

function SignatureModal({
  documentId,
  onClose,
  onSent,
}: {
  documentId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!recipient.trim()) {
      setError("Please enter an email or phone number.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/send-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          document_type: "change_order",
          recipient: recipient.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      onSent();
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
        <h2 className="font-bold text-lg text-[#1C1917] mb-3">Send for Signature</h2>
        <p className="text-sm text-stone-500 mb-4">
          Enter the homeowner&apos;s email or phone to send them a signature link.
        </p>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="email@example.com or +1 555..."
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#EA580C] mb-3"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-stone-200 text-stone-700 rounded-xl py-3 font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 bg-[#EA580C] text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Done State ───────────────────────────────────────────────────────────────

function DoneState({
  projectId,
  initialData,
  onRecordMore,
}: {
  projectId: string;
  initialData: TranscribeChangeOrderResult;
  onRecordMore: () => void;
}) {
  const router = useRouter();

  const [description, setDescription] = useState(initialData.description);
  const [requestedBy, setRequestedBy] = useState(initialData.requested_by);
  const [notes, setNotes] = useState(initialData.notes ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(initialData.line_items ?? []);
  const [showSigModal, setShowSigModal] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [error, setError] = useState("");

  const totalCost = lineItems.reduce((sum, li) => sum + (li.subtotal || li.quantity * li.rate), 0);

  function updateLineItem(idx: number, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== idx) return li;
        const updated = { ...li, ...patch };
        // Recalculate subtotal when qty or rate changes
        if ("quantity" in patch || "rate" in patch) {
          updated.subtotal = updated.quantity * updated.rate;
        }
        return updated;
      })
    );
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit: "hr", rate: 0, subtotal: 0 },
    ]);
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/save-change-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          description,
          requested_by: requestedBy,
          line_items: lineItems,
          total_cost: totalCost,
          notes,
          status: "draft",
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setSavedDocId(data.id ?? null);
      router.push(`/project/${projectId}`);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendForSignature() {
    if (!savedDocId) {
      // Save first, then open modal
      setSaving(true);
      setError("");
      try {
        const res = await fetch("/api/save-change-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            description,
            requested_by: requestedBy,
            line_items: lineItems,
            total_cost: totalCost,
            notes,
            status: "draft",
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        setSavedDocId(data.id);
        setShowSigModal(true);
      } catch {
        setError("Failed to save before sending. Please try again.");
      } finally {
        setSaving(false);
      }
    } else {
      setShowSigModal(true);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40">
        {/* Summary banner */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
          <p className="font-semibold text-green-800">Change order structured</p>
          <p className="text-sm text-green-600 mt-0.5">Review and edit below before sending or saving.</p>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-none"
            placeholder="Describe the change order..."
          />
        </div>

        {/* Requested by */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
            Requested By
          </label>
          <input
            type="text"
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
            placeholder="Homeowner name"
          />
        </div>

        {/* Line items */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Line Items
            </label>
            <button
              onClick={addLineItem}
              className="flex items-center gap-1 text-[#EA580C] text-sm font-semibold min-h-[44px] px-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {lineItems.length === 0 && (
            <p className="text-stone-400 text-sm text-center py-4">No line items yet</p>
          )}

          <div className="flex flex-col gap-3">
            {lineItems.map((li, idx) => (
              <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="flex items-start gap-2 mb-2">
                  <input
                    type="text"
                    value={li.description}
                    onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                    placeholder="Description"
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] bg-white"
                  />
                  <button
                    onClick={() => removeLineItem(idx)}
                    className="p-2 text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-stone-400 mb-0.5 block">Qty</label>
                    <input
                      type="number"
                      value={li.quantity}
                      onChange={(e) => updateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-stone-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-0.5 block">Unit</label>
                    <input
                      type="text"
                      value={li.unit}
                      onChange={(e) => updateLineItem(idx, { unit: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] bg-white"
                      placeholder="hr"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-0.5 block">Rate</label>
                    <input
                      type="number"
                      value={li.rate}
                      onChange={(e) => updateLineItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-stone-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-0.5 block">Subtotal</label>
                    <div className="border border-stone-200 rounded-lg px-2 py-2 text-sm bg-stone-100 text-stone-600 font-medium">
                      {formatCurrency(li.subtotal)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          {lineItems.length > 0 && (
            <div className="mt-3 flex items-center justify-between bg-[#1C1917] rounded-xl px-4 py-3">
              <span className="text-white font-semibold text-sm">Total</span>
              <span className="text-[#EA580C] font-bold text-xl">{formatCurrency(totalCost)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-none"
            placeholder="Additional notes..."
          />
        </div>

        {sendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
            <p className="text-green-700 text-sm text-center font-semibold">
              ✓ Signature request sent to homeowner
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 flex flex-col gap-2">
        <button
          onClick={handleSendForSignature}
          disabled={saving}
          className="w-full bg-[#EA580C] text-white rounded-2xl py-4 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg min-h-[52px]"
        >
          <Send size={20} />
          {saving ? "Saving..." : "Send for Signature"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 border border-stone-200 text-stone-700 rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 min-h-[52px]"
          >
            <Save size={16} />
            Save as Draft
          </button>
          <button
            onClick={onRecordMore}
            className="flex-1 border border-stone-200 text-stone-700 rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 min-h-[52px]"
          >
            <Mic size={16} />
            Record Again
          </button>
        </div>
      </div>

      {showSigModal && savedDocId && (
        <SignatureModal
          documentId={savedDocId}
          onClose={() => setShowSigModal(false)}
          onSent={() => {
            setShowSigModal(false);
            setSendSuccess(true);
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ChangeOrderPage({ params }: { params: { project_id: string } }) {
  const router = useRouter();
  const { project_id } = params;

  const [projectName, setProjectName] = useState("Loading...");
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [result, setResult] = useState<TranscribeChangeOrderResult | null>(null);
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startTimer = useCallback(() => {
    setTimerSeconds(0);
    timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        await processAudio(blob);
      };

      recorder.start(250);
      setStatus("recording");
      startTimer();
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission denied."
          : "Could not start recording."
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

      const res = await fetch("/api/transcribe-change-order", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Transcription failed");
      }

      const data: TranscribeChangeOrderResult = await res.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  function handleRecordMore() {
    setResult(null);
    setStatus("idle");
    setError("");
  }

  if (status === "done" && result) {
    return (
      <>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-stone-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => router.push(`/project/${project_id}`)}
            className="p-2 -ml-1 text-stone-500 hover:text-stone-800 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Change Order</p>
            <p className="font-semibold text-[#1C1917] truncate">{projectName}</p>
          </div>
        </div>
        <DoneState projectId={project_id} initialData={result} onRecordMore={handleRecordMore} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-stone-100">
        <button
          onClick={() => router.push(`/project/${project_id}`)}
          className="p-2 -ml-1 text-stone-500 hover:text-stone-800 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Change Order</p>
          <p className="font-semibold text-[#1C1917] truncate">{projectName}</p>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {status === "idle" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1C1917] mb-2">Record change order</h2>
              <p className="text-stone-500 text-sm max-w-xs">
                Describe what changed, who requested it, and the line items. We&apos;ll structure it automatically.
              </p>
            </div>

            {error && (
              <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              onClick={startRecording}
              className="w-24 h-24 bg-[#EA580C] rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-orange-700 active:scale-95 transition-all"
              aria-label="Start recording"
            >
              <Mic size={40} />
            </button>
            <p className="text-stone-400 text-sm font-medium">Tap to record change order</p>
          </>
        )}

        {status === "recording" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1C1917] mb-1">Recording...</h2>
              <p className="text-stone-500 text-sm">Speak clearly. Tap stop when done.</p>
            </div>
            <div className="text-4xl font-mono font-bold text-[#1C1917] tabular-nums">
              {formatTimer(timerSeconds)}
            </div>
            <Waveform />
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
            <div className="w-16 h-16 border-4 border-stone-200 border-t-[#EA580C] rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-[#1C1917] text-lg">Structuring your change order...</p>
              <p className="text-stone-400 text-sm mt-1">This usually takes 10–20 seconds</p>
            </div>
            <div className="w-full max-w-sm flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-stone-100 rounded-2xl animate-pulse"
                  style={{ opacity: 1 - i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {status === "recording" && (
        <div className="pb-8 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-stone-400 text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording in progress
          </div>
        </div>
      )}

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
