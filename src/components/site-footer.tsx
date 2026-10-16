import { getDictionary } from "@/i18n/get-dictionary";

export async function SiteFooter() {
  const dict = await getDictionary();
  return (
    <footer className="no-print" style={{ borderTop: "1px solid var(--line)" }}>
      <div
        className="container"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 32px",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBlock: 28,
          fontSize: 14,
          color: "var(--muted)",
        }}
      >
        <span style={{ fontFamily: "var(--font-script)", fontSize: 40, lineHeight: 1, color: "var(--ink)" }}>
          Cooking Stories
        </span>
        <span>{dict.footer.tagline}</span>
      </div>
    </footer>
  );
}
