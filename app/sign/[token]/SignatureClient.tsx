"use client";

import { useRef, useState, useEffect } from "react";
import type { Signature, ChangeOrder, PunchItem } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  sig: Signature;
  document: ChangeOrder | null;
  punchItems: PunchItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function severityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-700 border border-red-300";
    case "major": return "bg-amber-100 text-amber-700 border border-amber-400";
    default: return "bg-green-100 text-green-700 border border-green-400";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "in_progress": return "In Progress";
    case "completed": return "Completed";
    default: return "Open";
  }
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({
  onSign,
  signerName,
  onSignerNameChange,
  signing,
}: {
  onSign: (dataUrl: string) => void;
  signerName: string;
  onSignerNameChange: (v: string) => void;
  signing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1C1917";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(canvas: HTMLCanvasElement, e: React.Touch | React.MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "clientX" in e ? e.clientX : 0;
    const clientY = "clientY" in e ? e.clientY : 0;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  }

  function draw(x: number, y: number) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    isDrawing.current = false;
  }

  // Mouse events
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const pos = getPos(canvas, e);
    startDraw(pos.x, pos.y);
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const pos = getPos(canvas, e);
    draw(pos.x, pos.y);
  }

  // Touch events
  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch);
    startDraw(pos.x, pos.y);
  }
  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch);
    draw(pos.x, pos.y);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSign(dataUrl);
  }

  return (
    <div>
      {/* Signer name */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
          Your Name
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => onSignerNameChange(e.target.value)}
          placeholder="Full name"
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
        />
      </div>

      {/* Signature pad */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Signature
          </label>
          <button
            onClick={clearCanvas}
            className="text-xs text-stone-400 hover:text-stone-600 font-medium px-2 py-1 min-h-[36px]"
          >
            Clear
          </button>
        </div>
        <div className="border-2 border-stone-300 rounded-2xl overflow-hidden bg-stone-50 relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full touch-none cursor-crosshair"
            style={{ height: "160px" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={endDraw}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-stone-300 text-sm font-medium">Sign here</p>
            </div>
          )}
        </div>
        <div className="mt-1 border-t border-dashed border-stone-300 mx-2" />
      </div>

      <button
        onClick={handleSign}
        disabled={!hasDrawn || !signerName.trim() || signing}
        className="w-full bg-[#1C1917] text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-40 min-h-[52px] transition-opacity"
      >
        {signing ? "Submitting..." : "Sign Document"}
      </button>
      <p className="text-xs text-stone-400 text-center mt-2">
        By signing, you acknowledge and approve this document.
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SignatureClient({ sig, document, punchItems }: Props) {
  const [signerName, setSignerName] = useState(sig.signer_name ?? "");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState("");

  async function handleSign(dataUrl: string) {
    if (!signerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setSigning(true);
    setError("");
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sig.token,
          signature_data: dataUrl,
          signer_name: signerName.trim(),
        }),
      });
      if (!res.ok) throw new Error("Signing failed");
      setSigned(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSigning(false);
    }
  }

  // Group punch items by room
  const groupedPunchItems = punchItems.reduce<Record<string, PunchItem[]>>((acc, item) => {
    const room = item.room || "Unassigned";
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {});

  if (signed) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Logo />
        <div className="mt-10 max-w-sm w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
              <path d="M7 18L15 26L29 10" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Signed successfully!</h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            Both parties have been emailed a copy of the signed document. Thank you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3">
        <Logo />
        <div className="ml-auto">
          <span className="text-xs text-stone-400">Secure signature request</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-16">
        {/* Document type header */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#EA580C] mb-1">
            {sig.document_type === "change_order" ? "Change Order" : "Punch List"} — Signature Required
          </p>
          <h1 className="text-xl font-bold text-[#1C1917]">
            {sig.document_type === "change_order"
              ? "Please review and sign this change order"
              : "Please review and sign this punch list"}
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Expires {new Date(sig.expires_at).toLocaleDateString()}
          </p>
        </div>

        {/* ─── Change Order content ─────────────────────────────── */}
        {sig.document_type === "change_order" && document && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 shadow-sm">
            <h2 className="font-bold text-[#1C1917] text-base mb-1">{document.description}</h2>
            {document.requested_by && (
              <p className="text-sm text-stone-500 mb-4">Requested by: {document.requested_by}</p>
            )}

            {document.line_items && document.line_items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[340px]">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 pr-3 text-xs text-stone-500 font-semibold">Item</th>
                      <th className="text-right py-2 pr-3 text-xs text-stone-500 font-semibold">Qty</th>
                      <th className="text-right py-2 pr-3 text-xs text-stone-500 font-semibold">Rate</th>
                      <th className="text-right py-2 text-xs text-stone-500 font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.line_items.map((li, idx) => (
                      <tr key={idx} className="border-b border-stone-100 last:border-0">
                        <td className="py-2 pr-3 text-[#1C1917]">{li.description}</td>
                        <td className="py-2 pr-3 text-right text-stone-600">
                          {li.quantity} {li.unit}
                        </td>
                        <td className="py-2 pr-3 text-right text-stone-600">{formatCurrency(li.rate)}</td>
                        <td className="py-2 text-right font-semibold">{formatCurrency(li.subtotal)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="pt-3 text-right font-bold text-[#1C1917]">Total</td>
                      <td className="pt-3 text-right font-bold text-xl text-[#EA580C]">
                        {formatCurrency(document.total_cost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {document.notes && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-stone-600">{document.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Punch list content ───────────────────────────────── */}
        {sig.document_type === "punchlist" && punchItems.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 shadow-sm">
            <h2 className="font-bold text-[#1C1917] text-base mb-4">
              Punch List — {punchItems.length} item{punchItems.length !== 1 ? "s" : ""}
            </h2>

            {Object.entries(groupedPunchItems).map(([room, items]) => (
              <div key={room} className="mb-4 last:mb-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{room}</h3>
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
                      <span className="text-xs font-bold text-stone-400 w-6 flex-shrink-0 mt-0.5">
                        #{item.item_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1C1917] font-medium">{item.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs rounded px-1.5 py-0.5 font-semibold capitalize ${severityColor(item.severity)}`}>
                            {item.severity}
                          </span>
                          <span className="text-xs text-stone-400">{statusLabel(item.status)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signature section */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-[#1C1917] text-base mb-4">Your signature</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <SignatureCanvas
            onSign={handleSign}
            signerName={signerName}
            onSignerNameChange={setSignerName}
            signing={signing}
          />
        </div>

        <p className="text-xs text-stone-400 text-center mt-4 leading-relaxed">
          This is a legally binding electronic signature. By signing you confirm you have read and agree to the terms above.
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M3 14L9 4L15 14H3Z" fill="white" />
        </svg>
      </div>
      <span className="font-bold text-xl text-[#1C1917]">SiteWrap</span>
    </div>
  );
}
