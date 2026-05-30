import { Resend } from "resend";

function getAppName() {
  return process.env.APP_NAME?.trim() || "Operations Console";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail({ to, code, expiresMinutes }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim() || "onboarding@resend.dev";
  const appName = getAppName();
  const safeCode = escapeHtml(code);

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set; password reset code for ${to}: ${code}`);
    return { ok: true, dev: true };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${appName} — password reset code`,
    html: `
      <p>You requested a password reset for ${escapeHtml(appName)}.</p>
      <p>Your reset code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${safeCode}</p>
      <p>This code expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }

  return { ok: true };
}
