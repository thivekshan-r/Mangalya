import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { getSettings, usingSampleData } from "@/lib/catalogue";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";

async function FloatingWhatsApp() {
  const settings = await getSettings();
  return <WhatsAppFloat href={whatsappLink(settings.whatsappNumber, GENERAL_MESSAGE)} />;
}

/** The frame around every customer page: header, footer and the WhatsApp button. */
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {usingSampleData && (
        <p className="bg-gold px-4 py-1.5 text-center text-sm font-medium text-maroon-deep">
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
