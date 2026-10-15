import Link from "next/link";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

export default async function NotFound() {
  const dict = await getDictionary();
  const locale = await getLocale();
  return (
    <main className="container" style={{ paddingBlock: "48px 120px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>{dict.notFound.title}</h1>
      <p style={{ margin: 0, color: "var(--ink-soft)" }}>{dict.notFound.body}</p>
      <Link href={localePath(locale, "/")} className="button button-primary" style={{ alignSelf: "flex-start" }}>
        {dict.notFound.back}
      </Link>
    </main>
  );
}
