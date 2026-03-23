import { escapeHtml } from "@/lib/email/escape-html";

export function dailiesStatusEmailHtml(opts: {
  showName: string;
  bodyText: string;
}) {
  const body = escapeHtml(opts.bodyText).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#0a0a12;color:#e8e8f0;font-family:Inter,system-ui,sans-serif;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="font-size:20px;font-weight:700;color:#f1f0f0;">FRAMEWRIGHT</td></tr>
    <tr><td style="padding-top:8px;font-size:14px;color:#6c63ff;">Dailies · ${escapeHtml(opts.showName)}</td></tr>
    <tr><td style="padding-top:24px;font-size:15px;line-height:1.7;">${body}</td></tr>
  </table>
</body>
</html>`;
}
