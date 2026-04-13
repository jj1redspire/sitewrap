import { createClient } from "@/lib/supabase/server";
import SignatureClient from "./SignatureClient";
import type { Signature, ChangeOrder, PunchItem } from "@/types";

interface PageProps {
  params: { token: string };
}

// Fetch signature record plus related document
async function getSignatureData(token: string) {
  // Use service role for public signature pages (no user session)
  const supabase = createClient();

  const { data: sig, error } = await supabase
    .from("signatures")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !sig) return { error: "not_found" as const };

  // Check expiry
  if (new Date(sig.expires_at) < new Date()) return { error: "expired" as const };

  // Already signed
  if (sig.status === "signed") return { error: "already_signed" as const, sig: sig as Signature };

  let document: ChangeOrder | null = null;
  let punchItems: PunchItem[] = [];

  if (sig.document_type === "change_order") {
    const { data } = await supabase
      .from("change_orders")
      .select("*")
      .eq("id", sig.document_id)
      .single();
    document = data as ChangeOrder | null;
  } else if (sig.document_type === "punchlist") {
    const { data } = await supabase
      .from("punch_items")
      .select("*")
      .eq("project_id", sig.document_id)
      .order("item_number", { ascending: true });
    punchItems = (data ?? []) as PunchItem[];
  }

  return { sig: sig as Signature, document, punchItems };
}

export default async function SignPage({ params }: PageProps) {
  const result = await getSignatureData(params.token);

  if ("error" in result) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <Logo />
        <div className="mt-10 max-w-sm w-full text-center">
          {result.error === "not_found" && (
            <>
              <div className="text-5xl mb-4">🔍</div>
              <h1 className="text-xl font-bold text-[#1C1917] mb-2">Link not found</h1>
              <p className="text-stone-500 text-sm">
                This signature link doesn&apos;t exist. Please check your email or text message for the correct link.
              </p>
            </>
          )}
          {result.error === "expired" && (
            <>
              <div className="text-5xl mb-4">⏰</div>
              <h1 className="text-xl font-bold text-[#1C1917] mb-2">Link expired</h1>
              <p className="text-stone-500 text-sm">
                This signature link has expired. Please ask your contractor to send a new one.
              </p>
            </>
          )}
          {result.error === "already_signed" && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-[#1C1917] mb-2">Already signed</h1>
              <p className="text-stone-500 text-sm">
                This document has already been signed. Both parties have been emailed a copy.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <SignatureClient
      sig={result.sig!}
      document={result.document ?? null}
      punchItems={result.punchItems ?? []}
    />
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M3 14L9 4L15 14H3Z" fill="white" />
        </svg>
      </div>
      <span className="font-bold text-xl text-[#1C1917]">SiteWrap</span>
    </div>
  );
}
