import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatIcon } from "@/components/icons";
import { getSettings } from "@/lib/catalogue";
import { alternates } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { instagramHandle, text } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getI18n();
  return { title: t.contact.title, description: t.contact.description, alternates: alternates(lang, "/contact") };
}

const card = "rounded-xl border border-line bg-white p-4";
const label = "text-sm font-semibold text-maroon";

async function ContactDetails() {
  const [settings, { lang, t, path }] = await Promise.all([getSettings(), getI18n()]);
  const address = text(settings.address, lang);
  const hours = text(settings.openingHours, lang);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <a
        href={whatsappLink(settings.whatsappNumber, t.whatsapp.general)}
        className="flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-whatsapp font-semibold text-white hover:bg-whatsapp-deep"
      >
        <ChatIcon size={22} />
        {t.contact.whatsapp}
      </a>

      <div className={card}>
        <h2 className={label}>{t.contact.visit}</h2>
        <p className="mt-1 whitespace-pre-line text-ink-soft">{address || t.contact.addressMissing}</p>
      </div>

      <div className={card}>
        <h2 className={label}>{t.contact.hours}</h2>
        <p className="mt-1 whitespace-pre-line text-ink-soft">{hours || t.contact.hoursMissing}</p>
      </div>

      {settings.instagramUrl && (
        <div className={card}>
          <h2 className={label}>{t.contact.instagram}</h2>
          <a href={settings.instagramUrl} className="flex h-11 items-center font-semibold text-maroon underline">
            {instagramHandle(settings.instagramUrl)}
          </a>
        </div>
      )}

      <div className={card}>
        <h2 className={label}>{t.contact.wholesale}</h2>
        <p className="mt-1 text-ink-soft">{t.contact.wholesaleText}</p>
        <Link href={path("/wholesale")} className="flex h-11 items-center font-semibold text-maroon underline">
          {t.contact.wholesaleLink}
        </Link>
      </div>
    </div>
  );
}

export default async function ContactPage() {
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="font-serif text-[26px] font-semibold text-maroon md:text-4xl">{t.contact.title}</h1>
      <Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded-xl bg-sand" />}>
        <ContactDetails />
      </Suspense>
    </div>
  );
}
