"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, Save, Eye, EyeOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  email: string;
  userId: string;
}

interface DefaultRates {
  electrician: string;
  plumber: string;
  carpenter: string;
  generalLabor: string;
}

interface CompanyInfo {
  name: string;
  logoUrl: string;
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="font-bold text-[#1C1917] text-lg">{title}</h2>
        {description && <p className="text-stone-400 text-sm mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Feedback message ─────────────────────────────────────────────────────────

function Feedback({ msg, isError }: { msg: string; isError?: boolean }) {
  if (!msg) return null;
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm font-medium mt-3 ${
        isError
          ? "bg-red-50 border border-red-200 text-red-700"
          : "bg-green-50 border border-green-200 text-green-700"
      }`}
    >
      {msg}
    </div>
  );
}

// ─── Account Section ──────────────────────────────────────────────────────────

function AccountSection({ email }: { email: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: "", isError: false });

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ msg: "Passwords do not match.", isError: true });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ msg: "Password must be at least 8 characters.", isError: true });
      return;
    }
    setLoading(true);
    setFeedback({ msg: "", isError: false });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setFeedback({ msg: error.message, isError: true });
    } else {
      setFeedback({ msg: "Password updated successfully.", isError: false });
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  }

  return (
    <SectionCard title="Account" description="Manage your login credentials">
      <Field label="Email">
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-600 select-all">
          {email}
        </div>
      </Field>

      <form onSubmit={handleChangePassword}>
        <p className="text-sm font-semibold text-[#1C1917] mb-3">Change password</p>
        <Field label="New Password">
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirm New Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
            autoComplete="new-password"
          />
        </Field>

        <Feedback msg={feedback.msg} isError={feedback.isError} />

        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          className="mt-4 w-full bg-[#1C1917] text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 min-h-[52px]"
        >
          <Save size={16} />
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Company Section ──────────────────────────────────────────────────────────

// NOTE: Company info is persisted to localStorage until a user_profiles table is added.
// When user_profiles table exists, replace localStorage with a Supabase upsert call.

function CompanySection({ userId }: { userId: string }) {
  const [info, setInfo] = useState<CompanyInfo>({ name: "", logoUrl: "" });
  const [saved, setSaved] = useState(false);

  const storageKey = `sitewrap_company_${userId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setInfo(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [storageKey]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(storageKey, JSON.stringify(info));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <SectionCard
      title="Company"
      description="Your company details appear on change orders and punch lists"
    >
      <form onSubmit={handleSave}>
        <Field label="Company Name">
          <input
            type="text"
            value={info.name}
            onChange={(e) => setInfo((v) => ({ ...v, name: e.target.value }))}
            placeholder="Acme Construction"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
          />
        </Field>
        <Field label="Logo URL">
          <input
            type="url"
            value={info.logoUrl}
            onChange={(e) => setInfo((v) => ({ ...v, logoUrl: e.target.value }))}
            placeholder="https://example.com/logo.png"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
          />
          <p className="text-xs text-stone-400 mt-1">
            Paste a direct link to your logo image (PNG or SVG recommended)
          </p>
        </Field>

        {saved && <Feedback msg="Company info saved." />}

        <button
          type="submit"
          className="mt-2 w-full bg-[#EA580C] text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 min-h-[52px]"
        >
          <Save size={16} />
          Save Company Info
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Billing Section ──────────────────────────────────────────────────────────

function BillingSection() {
  return (
    <SectionCard title="Billing" description="Manage your subscription and payment methods">
      <p className="text-sm text-stone-500 mb-4">
        Update your plan, view invoices, or update your payment method through the billing portal.
      </p>
      <a
        href="/api/stripe/portal"
        className="w-full bg-[#1C1917] text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 min-h-[52px] hover:bg-stone-800 transition-colors"
      >
        <ExternalLink size={16} />
        Manage Billing
      </a>
    </SectionCard>
  );
}

// ─── Default Rates Section ─────────────────────────────────────────────────────

// Stored in localStorage. Replace with Supabase when user_profiles table is added.

const RATE_STORAGE_KEY = "sitewrap_default_rates";

const TRADES: { key: keyof DefaultRates; label: string; placeholder: string }[] = [
  { key: "electrician", label: "Electrician", placeholder: "95" },
  { key: "plumber", label: "Plumber", placeholder: "90" },
  { key: "carpenter", label: "Carpenter", placeholder: "75" },
  { key: "generalLabor", label: "General Labor", placeholder: "55" },
];

function DefaultRatesSection() {
  const [rates, setRates] = useState<DefaultRates>({
    electrician: "",
    plumber: "",
    carpenter: "",
    generalLabor: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RATE_STORAGE_KEY);
      if (stored) setRates(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rates));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <SectionCard
      title="Default Rates"
      description="Pre-fill hourly rates on change order line items"
    >
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {TRADES.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                {label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rates[key]}
                  onChange={(e) => setRates((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-400 mb-4">Per hour ($/hr). Leave blank to skip auto-fill.</p>

        {saved && <Feedback msg="Default rates saved." />}

        <button
          type="submit"
          className="w-full bg-[#EA580C] text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 min-h-[52px]"
        >
          <Save size={16} />
          Save Default Rates
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsClient({ email, userId }: Props) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1C1917]">Settings</h1>
        <p className="text-stone-400 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col gap-5">
        <AccountSection email={email} />
        <CompanySection userId={userId} />
        <BillingSection />
        <DefaultRatesSection />
      </div>
    </div>
  );
}
