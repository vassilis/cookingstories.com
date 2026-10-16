import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Every regular page: header, content, footer. The cooking assistant lives outside this group. */
export default function SiteLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
