"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, ChevronDown, ChevronUp, X, Download, Send } from "lucide-react";
import type { Project, PunchItem, ChangeOrder, ItemSeverity, ItemStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  project: Project;
  initialItems: PunchItem[];
  initialChangeOrders: ChangeOrder[];
}

type SeverityFilter = "all" | ItemSeverity;
type StatusFilter = "all" | ItemStatus;

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityBadge(severity: ItemSeverity) {
  const map: Record<ItemSeverity, string> = {
    critical: "bg-red-600 text-white",
    major: "bg-amber-500 text-white",
    minor: "bg-green-600 text-white",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${map[severity]}`}
    >
      {severity}
    </span>
  );
}

function statusBadge(status: ItemStatus) {
  const map: Record<ItemStatus, string> = {
    open: "border border-red-500 text-red-600 bg-red-50",
    in_progress: "border border-amber-500 text-amber-700 bg-amber-50",
    completed: "bg-green-600 text-white",
  };
  const labels: Record<ItemStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function changeOrderStatusBadge(status: ChangeOrder["status"]) {
  const map: Record<ChangeOrder["status"], string> = {
    draft: "bg-stone-200 text-stone-700",
    sent: "bg-amber-100 text-amber-800 border border-amber-400",
    signed: "bg-green-100 text-green-800 border border-green-500",
    rejected: "bg-red-100 text-red-800 border border-red-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold capitalize ${map[status]}`}
    >
      {status}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Send for Signature Modal ─────────────────────────────────────────────────

function SignatureModal({
  documentId,
  documentType,
  onClose,
}: {
  documentId: string;
  documentType: "change_order" | "punchlist";
  onClose: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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
          document_type: documentType,
          recipient: recipient.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
        {sent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-lg text-[#1C1917]">Signature request sent!</p>
            <p className="text-stone-500 mt-1 text-sm">The recipient will receive a link to sign.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-[#EA580C] text-white rounded-xl py-3 font-semibold text-base"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1C1917]">Send for Signature</h2>
              <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Enter the homeowner&apos;s email or phone number to send a signature link.
            </p>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="email@example.com or +1 555..."
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#EA580C] mb-3"
            />
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full bg-[#EA580C] text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {sending ? "Sending..." : "Send Signature Link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Punch List Tab ────────────────────────────────────────────────────────────

function PunchListTab({
  projectId,
  initialItems,
}: {
  projectId: string;
  initialItems: PunchItem[];
}) {
  const [items, setItems] = useState<PunchItem[]>(initialItems);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const completed = items.filter((i) => i.status === "completed").length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const filtered = items.filter((item) => {
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  // Group by room
  const grouped = filtered.reduce<Record<string, PunchItem[]>>((acc, item) => {
    const room = item.room || "Unassigned";
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {});

  async function updateStatus(itemId: string, newStatus: ItemStatus) {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
    );
    setUpdating(itemId);
    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, status: items.find((x) => x.id === itemId)?.status ?? newStatus }
            : i
        )
      );
    } finally {
      setUpdating(null);
    }
  }

  const severityFilters: { label: string; value: SeverityFilter; color: string }[] = [
    { label: "All", value: "all", color: "bg-stone-100 text-stone-700 border border-stone-300" },
    { label: "Critical", value: "critical", color: "bg-red-100 text-red-700 border border-red-300" },
    { label: "Major", value: "major", color: "bg-amber-100 text-amber-700 border border-amber-400" },
    { label: "Minor", value: "minor", color: "bg-green-100 text-green-700 border border-green-400" },
  ];

  const statusFilters: { label: string; value: StatusFilter; color: string }[] = [
    { label: "All Status", value: "all", color: "bg-stone-100 text-stone-700 border border-stone-300" },
    { label: "Open", value: "open", color: "bg-red-50 text-red-700 border border-red-300" },
    { label: "In Progress", value: "in_progress", color: "bg-amber-50 text-amber-700 border border-amber-400" },
    { label: "Completed", value: "completed", color: "bg-green-50 text-green-700 border border-green-400" },
  ];

  return (
    <div className="pb-32">
      {/* Progress */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-600">
            {completed} of {total} items completed
          </span>
          <span className="text-sm font-bold text-[#EA580C]">{pct}%</span>
        </div>
        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#EA580C] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Severity filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 no-scrollbar">
        {severityFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setSeverityFilter(f.value)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
              severityFilter === f.value
                ? f.value === "all"
                  ? "bg-stone-700 text-white"
                  : f.value === "critical"
                  ? "bg-red-600 text-white"
                  : f.value === "major"
                  ? "bg-amber-500 text-white"
                  : "bg-green-600 text-white"
                : f.color
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
              statusFilter === f.value ? "bg-[#1C1917] text-white" : f.color
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped items */}
      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg font-medium">No items found</p>
          <p className="text-sm mt-1">Adjust filters or start a walk to add items</p>
        </div>
      )}

      {Object.entries(grouped).map(([room, roomItems]) => (
        <div key={room} className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 px-1">
            {room}
          </h3>
          <div className="flex flex-col gap-3">
            {roomItems.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Item header — tappable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left p-4 flex items-start gap-3 min-h-[52px]"
                  >
                    {/* Number badge */}
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {item.item_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1C1917] text-sm leading-snug">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {severityBadge(item.severity)}
                        {statusBadge(item.status)}
                        {item.assigned_trade && (
                          <span className="text-xs text-stone-500 bg-stone-100 rounded px-2 py-0.5">
                            {item.assigned_trade}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} className="flex-shrink-0 text-stone-400 mt-1" />
                    ) : (
                      <ChevronDown size={18} className="flex-shrink-0 text-stone-400 mt-1" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-stone-100 p-4 bg-stone-50">
                      {item.notes && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-[#1C1917]">{item.notes}</p>
                        </div>
                      )}

                      {/* Photo thumbnails */}
                      {item.photo_urls && item.photo_urls.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                            Photos
                          </p>
                          <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {item.photo_urls.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-stone-200"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status actions */}
                      <div className="flex gap-2 flex-wrap">
                        {item.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(item.id, "completed")}
                            disabled={updating === item.id}
                            className="flex-1 min-w-[130px] bg-green-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                          >
                            Mark Complete
                          </button>
                        )}
                        {item.status !== "in_progress" && item.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(item.id, "in_progress")}
                            disabled={updating === item.id}
                            className="flex-1 min-w-[130px] bg-amber-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                          >
                            Mark In Progress
                          </button>
                        )}
                        {item.status === "completed" && (
                          <button
                            onClick={() => updateStatus(item.id, "open")}
                            disabled={updating === item.id}
                            className="flex-1 min-w-[130px] border border-stone-300 text-stone-600 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Floating action button */}
      <Link
        href={`/walk/${projectId}`}
        className="fixed bottom-6 right-6 z-40 w-20 h-20 bg-[#EA580C] rounded-full shadow-2xl flex flex-col items-center justify-center text-white gap-0.5 hover:bg-orange-700 transition-colors"
        aria-label="Walk & Record"
      >
        <Mic size={26} />
        <span className="text-[10px] font-bold leading-none text-center">Walk &amp; Record</span>
      </Link>
    </div>
  );
}

// ─── Change Orders Tab ─────────────────────────────────────────────────────────

function ChangeOrdersTab({
  projectId,
  initialChangeOrders,
}: {
  projectId: string;
  initialChangeOrders: ChangeOrder[];
}) {
  const [orders, setOrders] = useState<ChangeOrder[]>(initialChangeOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sigModal, setSigModal] = useState<string | null>(null);

  function handleSigned(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "sent" as const } : o))
    );
    setSigModal(null);
  }

  return (
    <div className="pb-24">
      {/* New Change Order button */}
      <Link
        href={`/change-order/${projectId}`}
        className="w-full mb-5 flex items-center justify-center gap-2 bg-[#EA580C] text-white rounded-2xl py-4 font-semibold text-base shadow-sm hover:bg-orange-700 transition-colors min-h-[52px]"
      >
        <Mic size={20} />
        Record New Change Order
      </Link>

      {orders.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg font-medium">No change orders yet</p>
          <p className="text-sm mt-1">Tap above to record one with your voice</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {orders.map((order) => {
          const isExpanded = expandedId === order.id;
          return (
            <div
              key={order.id}
              className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className="w-full text-left p-4 min-h-[52px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[#1C1917] text-sm leading-snug flex-1">
                    {order.description}
                  </p>
                  {isExpanded ? (
                    <ChevronUp size={18} className="flex-shrink-0 text-stone-400 mt-0.5" />
                  ) : (
                    <ChevronDown size={18} className="flex-shrink-0 text-stone-400 mt-0.5" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-base font-bold text-[#1C1917]">
                    {formatCurrency(order.total_cost)}
                  </span>
                  {changeOrderStatusBadge(order.status)}
                  <span className="text-xs text-stone-400">{timeAgo(order.created_at)}</span>
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-stone-100 p-4 bg-stone-50">
                  {/* Line items table */}
                  {order.line_items && order.line_items.length > 0 && (
                    <div className="mb-4 overflow-x-auto">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                        Line Items
                      </p>
                      <table className="w-full text-sm border-collapse min-w-[400px]">
                        <thead>
                          <tr className="border-b border-stone-200">
                            <th className="text-left py-2 pr-3 text-xs text-stone-500 font-semibold">
                              Description
                            </th>
                            <th className="text-right py-2 pr-3 text-xs text-stone-500 font-semibold">
                              Qty
                            </th>
                            <th className="text-right py-2 pr-3 text-xs text-stone-500 font-semibold">
                              Unit
                            </th>
                            <th className="text-right py-2 pr-3 text-xs text-stone-500 font-semibold">
                              Rate
                            </th>
                            <th className="text-right py-2 text-xs text-stone-500 font-semibold">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.line_items.map((li, idx) => (
                            <tr key={idx} className="border-b border-stone-100 last:border-0">
                              <td className="py-2 pr-3 text-[#1C1917]">{li.description}</td>
                              <td className="py-2 pr-3 text-right text-stone-600">{li.quantity}</td>
                              <td className="py-2 pr-3 text-right text-stone-600">{li.unit}</td>
                              <td className="py-2 pr-3 text-right text-stone-600">
                                {formatCurrency(li.rate)}
                              </td>
                              <td className="py-2 text-right font-semibold text-[#1C1917]">
                                {formatCurrency(li.subtotal)}
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={4} className="pt-3 text-right text-sm font-bold text-[#1C1917]">
                              Total
                            </td>
                            <td className="pt-3 text-right text-base font-bold text-[#EA580C]">
                              {formatCurrency(order.total_cost)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {order.notes && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-[#1C1917]">{order.notes}</p>
                    </div>
                  )}

                  {/* Signature status */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                      Signature
                    </p>
                    {order.status === "signed" ? (
                      <p className="text-sm text-green-600 font-semibold">
                        ✓ Signed by {order.signed_by ?? "client"}{" "}
                        {order.signed_at ? `on ${new Date(order.signed_at).toLocaleDateString()}` : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-500">Not yet signed</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {order.status !== "signed" && order.status !== "rejected" && (
                      <button
                        onClick={() => setSigModal(order.id)}
                        className="flex-1 min-w-[140px] bg-[#EA580C] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Send size={16} />
                        Send for Signature
                      </button>
                    )}
                    {order.pdf_url && (
                      <a
                        href={order.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[140px] border border-stone-300 text-stone-700 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Signature modal */}
      {sigModal && (
        <SignatureModal
          documentId={sigModal}
          documentType="change_order"
          onClose={() => {
            handleSigned(sigModal);
          }}
        />
      )}
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export default function ProjectDetailClient({
  project,
  initialItems,
  initialChangeOrders,
}: Props) {
  const [activeTab, setActiveTab] = useState<"punch" | "co">("punch");

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      {/* Project header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1C1917] leading-tight">{project.name}</h1>
        {project.address && (
          <p className="text-stone-500 text-sm mt-0.5">{project.address}</p>
        )}
        {project.client_name && (
          <p className="text-stone-400 text-sm">Client: {project.client_name}</p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("punch")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
            activeTab === "punch"
              ? "bg-white text-[#1C1917] shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Punch List
          {initialItems.filter((i) => i.status !== "completed").length > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {initialItems.filter((i) => i.status !== "completed").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("co")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
            activeTab === "co"
              ? "bg-white text-[#1C1917] shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Change Orders
          {initialChangeOrders.filter((o) => o.status === "draft" || o.status === "sent").length > 0 && (
            <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {initialChangeOrders.filter((o) => o.status === "draft" || o.status === "sent").length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "punch" ? (
        <PunchListTab projectId={project.id} initialItems={initialItems} />
      ) : (
        <ChangeOrdersTab projectId={project.id} initialChangeOrders={initialChangeOrders} />
      )}
    </div>
  );
}
