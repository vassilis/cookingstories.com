import type { Metadata } from "next";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.signIn.title, robots: { index: false } };
}

export default async function SignInPage() {
  const dict = await getDictionary();
  const locale = await getLocale();

  return (
    <main className="container" style={{ paddingBlock: "32px 120px" }}>
      <div
        style={{
          position: "relative",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "40px 36px 40px 76px",
          background: "var(--sheet)",
          boxShadow: "var(--shadow-sheet)",
        }}
      >
        <span
          aria-hidden="true"
          style={{ position: "absolute", top: 0, bottom: 0, left: 52, width: 2, background: "var(--margin)" }}
        />
        <h1 style={{ fontSize: 44 }}>{dict.signIn.title}</h1>
        <p style={{ margin: 0, color: "var(--ink-soft)" }}>{dict.signIn.intro}</p>
        {/* The form reads ?next= from the URL, which is only known at request time. */}
        <Suspense fallback={null}>
        <SignInForm
          callbackURL={localePath(locale, "/")}
          labels={{
            email: dict.signIn.email,
            submit: dict.signIn.submit,
            sending: dict.signIn.sending,
            sent: dict.signIn.sent,
            error: dict.signIn.error,
          }}
        />
        </Suspense>
      </div>
    </main>
  );
}
