import "server-only";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain, short sign-in email. Kept in code so it works without Brevo templates. */
export function magicLinkEmail(url: string) {
  const safeUrl = escape(url);
  return {
    subject: "Your sign-in link for Cooking Stories",
    text: `Click this link to sign in to Cooking Stories:\n\n${url}\n\nIt works for the next 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1E2A44;max-width:480px">
<p>Click the button to sign in to Cooking Stories.</p>
<p><a href="${safeUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#1E2A44;color:#F6F5F0;text-decoration:none">Sign in</a></p>
<p style="color:#5A6378;font-size:14px">The link works for the next 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`,
  };
}
