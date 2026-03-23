import { escapeHtml } from "@/lib/email/escape-html";

export function digestEmailHtml(opts: {
  showName: string;
  bodyText: string;
  dashboardUrl: string;
  settingsUrl: string;
}) {
  const body = escapeHtml(opts.bodyText).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#080808;color:#F5F0E8;font-family:Inter,system-ui,sans-serif;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="font-size:20px;font-weight:700;color:#F5F0E8;">FRAMEWRIGHT</td></tr>
    <tr><td style="padding-top:8px;font-size:14px;color:#D4A853;">${escapeHtml(opts.showName)}</td></tr>
    <tr><td style="padding-top:24px;font-size:15px;line-height:1.7;">${body}</td></tr>
    <tr><td style="padding-top:32px;font-size:12px;color:#A09880;line-height:1.6;">
      <a href="${escapeHtml(opts.dashboardUrl)}" style="color:#D4A853;">View your show</a><br/>
      <a href="${escapeHtml(opts.settingsUrl)}" style="color:#D4A853;">Manage notifications</a>
    </td></tr>
  </table>
</body>
</html>`;
}
