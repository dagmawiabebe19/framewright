import { Resend } from "resend";

export async function sendInviteEmail(params: {
  to: string;
  orgName: string;
  inviteToken: string;
  role: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const link = `${site}/auth?invite=${encodeURIComponent(params.inviteToken)}`;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from:
      process.env.RESEND_FROM ||
      "FRAMEWRIGHT <onboarding@resend.dev>",
    to: params.to,
    subject: `You are invited to ${params.orgName} on FRAMEWRIGHT`,
    text: [
      `${params.orgName} invited you to collaborate on FRAMEWRIGHT.`,
      `Role: ${params.role}`,
      "",
      `Open this link using the same email address (${params.to}):`,
      link,
      "",
      "Post production, finally coordinated.",
    ].join("\n"),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
