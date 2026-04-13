import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

function getResend() { return new Resend(process.env.RESEND_API_KEY!); }

interface SignBody {
  token: string;
  signer_name: string;
  signature_data: string; // base64 PNG
}

function buildContractorConfirmationHtml(
  signerName: string,
  documentType: string
): string {
  const label = documentType === "change_order" ? "Change Order" : "Punch List";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;">SiteWrap</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Document Signed</h1>
              <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">
                Your <strong>${label}</strong> has been signed by <strong>${signerName}</strong>.
              </p>
              <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">
                Log in to SiteWrap to view the signed document and download a copy for your records.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SiteWrap &mdash; Construction documentation made simple.</p>
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

function buildSignerConfirmationHtml(documentType: string): string {
  const label = documentType === "change_order" ? "Change Order" : "Punch List";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;">SiteWrap</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Signature Confirmed</h1>
              <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">
                Thank you. You have successfully signed the <strong>${label}</strong>.
              </p>
              <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">
                A copy of this confirmation has been sent to the contractor. Please retain this email for your records.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SiteWrap &mdash; Construction documentation made simple.</p>
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
    let body: SignBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { token, signer_name, signature_data } = body;

    if (!token || !signer_name || !signature_data) {
      return NextResponse.json(
        { error: "Missing required fields: token, signer_name, signature_data" },
        { status: 400 }
      );
    }

    // 2. Use service client for all DB operations (token-based public access)
    const supabase = createServiceClient();

    // 3. Fetch signature record by token
    const { data: sigRecord, error: fetchError } = await supabase
      .from("signatures")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !sigRecord) {
      return NextResponse.json(
        { error: "Invalid or expired signature link" },
        { status: 404 }
      );
    }

    // 4. Check not expired
    const now = new Date();
    const expiresAt = new Date(sigRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "This signature link has expired" },
        { status: 410 }
      );
    }

    // 5. Check not already signed
    if (sigRecord.status === "signed") {
      return NextResponse.json(
        { error: "This document has already been signed" },
        { status: 409 }
      );
    }

    // 6. Convert base64 to Buffer and upload signature image
    // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
    const base64Clean = signature_data.replace(/^data:image\/\w+;base64,/, "");
    const signatureBuffer = Buffer.from(base64Clean, "base64");
    const imagePath = `${token}.png`;

    const { error: imgUploadError } = await supabase.storage
      .from("signatures")
      .upload(imagePath, signatureBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (imgUploadError) {
      console.error("Signature image upload error:", imgUploadError);
      return NextResponse.json(
        { error: "Failed to save signature image" },
        { status: 500 }
      );
    }

    const { data: imgUrlData } = supabase.storage
      .from("signatures")
      .getPublicUrl(imagePath);
    const signatureImageUrl = imgUrlData.publicUrl;

    // 7. Update signatures table
    const { error: sigUpdateError } = await supabase
      .from("signatures")
      .update({
        status: "signed",
        signer_name,
        signature_image_url: signatureImageUrl,
        signed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (sigUpdateError) {
      console.error("Signature update error:", sigUpdateError);
      return NextResponse.json(
        { error: "Failed to record signature" },
        { status: 500 }
      );
    }

    // 8. Update related document with signed status
    if (sigRecord.document_type === "change_order") {
      const { error: coUpdateError } = await supabase
        .from("change_orders")
        .update({
          status: "signed",
          signed_by: signer_name,
          signed_at: new Date().toISOString(),
        })
        .eq("id", sigRecord.document_id);

      if (coUpdateError) {
        console.error("Change order signed update error:", coUpdateError);
      }
    }
    // For punchlist: the signature record itself represents the sign-off

    // 9. Send confirmation emails
    const documentType = sigRecord.document_type as string;

    // Send to signer if email is known
    if (sigRecord.signer_email) {
      const { error: signerEmailError } = await getResend().emails.send({
        from: "SiteWrap <noreply@sitewrap.co>",
        to: sigRecord.signer_email,
        subject: "Your signature has been recorded",
        html: buildSignerConfirmationHtml(documentType),
      });

      if (signerEmailError) {
        console.error("Signer confirmation email error:", signerEmailError);
      }
    }

    // Look up the project owner to notify contractor
    // Find the project via the document
    let contractorEmail: string | null = null;

    try {
      if (documentType === "change_order") {
        const { data: co } = await supabase
          .from("change_orders")
          .select("project_id")
          .eq("id", sigRecord.document_id)
          .single();

        if (co) {
          const { data: project } = await supabase
            .from("projects")
            .select("user_id")
            .eq("id", co.project_id)
            .single();

          if (project) {
            const { data: userData } = await supabase.auth.admin.getUserById(
              project.user_id
            );
            contractorEmail = userData?.user?.email ?? null;
          }
        }
      }
    } catch (lookupErr) {
      console.error("Contractor email lookup error:", lookupErr);
    }

    if (contractorEmail) {
      const { error: contractorEmailError } = await getResend().emails.send({
        from: "SiteWrap <noreply@sitewrap.co>",
        to: contractorEmail,
        subject: `Document signed by ${signer_name}`,
        html: buildContractorConfirmationHtml(signer_name, documentType),
      });

      if (contractorEmailError) {
        console.error("Contractor confirmation email error:", contractorEmailError);
      }
    }

    // 10. Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
