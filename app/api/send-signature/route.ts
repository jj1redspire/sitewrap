import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

function getResend() { return new Resend(process.env.RESEND_API_KEY!); }

interface SendSignatureBody {
  document_id: string;
  document_type: "punchlist" | "change_order";
  recipient_email?: string;
  recipient_phone?: string;
}

function getDocumentTypeLabel(type: "punchlist" | "change_order"): string {
  return type === "punchlist" ? "Punch List" : "Change Order";
}

function buildSignatureEmailHtml(signatureUrl: string, documentTypeLabel: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Signature Request</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">SiteWrap</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">
                Signature Required
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#4b5563;line-height:1.6;">
                You have been asked to review and sign the following document:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Document Type</p>
                    <p style="margin:4px 0 0;font-size:18px;color:#111827;font-weight:600;">${documentTypeLabel}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                Click the button below to review the document and provide your electronic signature. This link expires in <strong>7 days</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#2563eb;border-radius:6px;">
                    <a href="${signatureUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Review &amp; Sign Document
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                If the button above doesn't work, copy and paste this link into your browser:<br />
                <a href="${signatureUrl}" style="color:#2563eb;word-break:break-all;">${signatureUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent via SiteWrap &mdash; Construction documentation made simple.<br />
                If you did not expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: SendSignatureBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { document_id, document_type, recipient_email } = body;

    if (!document_id || !document_type) {
      return NextResponse.json(
        { error: "Missing required fields: document_id and document_type" },
        { status: 400 }
      );
    }

    if (!["punchlist", "change_order"].includes(document_type)) {
      return NextResponse.json(
        { error: "document_type must be 'punchlist' or 'change_order'" },
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

    // 3. Generate unique token
    const token = crypto.randomUUID();

    // 4. Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 5. Insert signature record
    const { error: sigInsertError } = await supabase
      .from("signatures")
      .insert({
        document_type,
        document_id,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        signer_email: recipient_email ?? null,
      });

    if (sigInsertError) {
      console.error("Signature insert error:", sigInsertError);
      return NextResponse.json(
        { error: "Failed to create signature request" },
        { status: 500 }
      );
    }

    // 6. Build signature URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const signatureUrl = `${appUrl}/sign/${token}`;
    const documentTypeLabel = getDocumentTypeLabel(document_type);

    // 7. Send email via Resend if recipient_email provided
    if (recipient_email) {
      const { error: emailError } = await getResend().emails.send({
        from: "SiteWrap <noreply@sitewrap.co>",
        to: recipient_email,
        subject: `Please review and sign: ${documentTypeLabel}`,
        html: buildSignatureEmailHtml(signatureUrl, documentTypeLabel),
      });

      if (emailError) {
        console.error("Resend email error:", emailError);
        // Non-fatal: signature record is created, URL can be shared manually
      }
    }

    // 8. Update related document with signature_token
    if (document_type === "change_order") {
      const { error: updateError } = await supabase
        .from("change_orders")
        .update({
          signature_token: token,
          signature_url: signatureUrl,
          status: "sent",
        })
        .eq("id", document_id);

      if (updateError) {
        console.error("Change order update error:", updateError);
      }
    }
    // Note: punchlist signature links to the project-level signature record

    // 9. Return success
    return NextResponse.json({
      success: true,
      signature_url: signatureUrl,
    });
  } catch (error) {
    console.error("Send signature error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
