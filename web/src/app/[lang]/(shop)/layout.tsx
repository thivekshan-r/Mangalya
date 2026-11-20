import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { getSettings, usingSampleData } from "@/lib/catalogue";
import { getI18n } from "@/lib/i18n-server";
import { whatsappLink } from "@/lib/whatsapp";

async function FloatingWhatsApp() {
  const [settings, { t }] = await Promise.all([getSettings(), getI18n()]);
  return <WhatsAppFloat href={whatsappLink(settings.whatsappNumber, t.whatsapp.general)} />;
}

/** The frame around every customer page: header, footer and the WhatsApp button. */
export default function ShopLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <>
      {usingSampleData && (
        <p lang="en" className="bg-gold px-4 py-1.5 text-center text-sm font-medium text-maroon-deep">
          Sample products shown. Set API_URL in web/.env.local to use the real catalogue.
        </p>
      )}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Suspense>
        <FloatingWhatsApp />
      </Suspense>
    </>
  );
}
