import "server-only";
import { env } from "@/lib/env";

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Sends a transactional email through Brevo's HTTP API.
 * We use the API rather than SMTP because Hetzner blocks outgoing mail ports on new servers.
 */
export async function sendEmail({ to, subject, html, text }: Email): Promise<void> {
  const { BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME } = env();
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`);
  }
}
