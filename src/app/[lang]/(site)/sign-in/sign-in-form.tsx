"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Status = "idle" | "sending" | "sent" | "error";

export function SignInForm({
  callbackURL,
  labels,
}: {
  callbackURL: string;
  labels: { email: string; submit: string; sending: string; sent: string; error: string };
}) {
  const [status, setStatus] = useState<Status>("idle");
  // ?next=/notebook brings the reader back to where they were. Same-site paths only.
  const next = useSearchParams().get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : callbackURL;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    setStatus("sending");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: destination });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <p role="status" style={{ margin: 0, padding: "14px 16px", background: "var(--blue-wash)", color: "var(--blue)" }}>
        {labels.sent}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
      <label htmlFor="email" style={{ fontSize: 15 }}>
        {labels.email}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        style={{
          height: 48,
          padding: "0 14px",
          border: "1px solid var(--line-strong)",
          borderRadius: 8,
          font: "inherit",
          fontSize: 16,
          color: "var(--ink)",
        }}
      />
      <button type="submit" className="button button-primary" disabled={status === "sending"} style={{ justifyContent: "center" }}>
        {status === "sending" ? labels.sending : labels.submit}
      </button>
      {status === "error" && (
        <p role="alert" style={{ margin: 0, color: "var(--red)" }}>
          {labels.error}
        </p>
      )}
    </form>
  );
}
