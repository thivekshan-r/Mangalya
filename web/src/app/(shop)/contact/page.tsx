import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatIcon } from "@/components/icons";
import { getSettings } from "@/lib/catalogue";
import { instagramHandle, text } from "@/lib/site";
import { GENERAL_MESSAGE, WHOLESALE_MESSAGE, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact",
  description: "Find Mangalya, see our opening hours, or message us on WhatsApp and Instagram.",
  alternates: { canonical: "/contact" },
};

const card = "rounded-xl border border-line bg-white p-4";
const label = "text-sm font-semibold text-maroon";

async function ContactDetails() {
  const settings = await getSettings();
  const address = text(settings.address);
  const hours = text(settings.openingHours);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <a
        href={whatsappLink(settings.whatsappNumber, GENERAL_MESSAGE)}
        className="flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-whatsapp font-semibold text-white hover:bg-whatsapp-deep"
      >
        <ChatIcon size={22} />
        Message us on WhatsApp
      </a>

      <div className={card}>
        <h2 className={label}>Visit the shop</h2>
        <p className="mt-1 whitespace-pre-line text-ink-soft">{address || "[Shop address]"}</p>
      </div>

      <div className={card}>
        <h2 className={label}>Opening hours</h2>
        <p className="mt-1 whitespace-pre-line text-ink-soft">{hours || "[Opening hours]"}</p>
      </div>

      {settings.instagramUrl && (
        <div className={card}>
          <h2 className={label}>Instagram</h2>
          <a href={settings.instagramUrl} className="flex h-11 items-center font-semibold text-maroon underline">
            {instagramHandle(settings.instagramUrl)}
          </a>
        </div>
      )}

      <div className={card}>
        <h2 className={label}>Wholesale</h2>
        <p className="mt-1 text-ink-soft">Buying for a shop or an event? Send us your list for a quote.</p>
        <a
          href={whatsappLink(settings.whatsappNumber, WHOLESALE_MESSAGE)}
          className="flex h-11 items-center font-semibold text-maroon underline"
        >
          Ask for wholesale prices
        </a>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="font-serif text-[26px] font-semibold text-maroon md:text-4xl">Contact</h1>
      <Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded-xl bg-sand" />}>
        <ContactDetails />
      </Suspense>
    </div>
  );
}
