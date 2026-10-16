import type { Metadata } from "next";
import { GFS_Didot, Literata, Sacramento } from "next/font/google";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import "../globals.css";

const didot = GFS_Didot({ weight: "400", subsets: ["latin", "greek"], variable: "--font-didot" });
const literata = Literata({
  subsets: ["latin", "greek"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-literata",
});
const sacramento = Sacramento({ weight: "400", subsets: ["latin"], variable: "--font-sacramento" });

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    metadataBase: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL) : undefined,
    alternates: { languages: { en: "/", el: "/el" } },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    // Browser extensions often add attributes to <html> before React loads; ignore those differences here only.
    <html lang={locale} className={`${didot.variable} ${literata.variable} ${sacramento.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
