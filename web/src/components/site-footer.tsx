import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/logo.png";
import { getSettings } from "@/lib/catalogue";
import { getI18n } from "@/lib/i18n-server";
import { text } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";

const linkClass = "flex h-11 items-center font-semibold text-gold hover:underline";

async function ShopDetails() {
  const [settings, { lang, t, path }] = await Promise.all([getSettings(), getI18n()]);
  const address = text(settings.address, lang);
  const hours = text(settings.openingHours, lang);

  return (
    <>
      {address && <p className="whitespace-pre-line">{address}</p>}
      {hours && <p className="whitespace-pre-line">{hours}</p>}
      <div className="flex flex-wrap justify-center gap-x-6">
        <a href={whatsappLink(settings.whatsappNumber, t.whatsapp.general)} className={linkClass}>
          {t.footer.whatsapp}
        </a>
        {settings.instagramUrl && (
          <a href={settings.instagramUrl} className={linkClass}>
            {t.footer.instagram}
          </a>
        )}
        <Link href={path("/contact")} className={linkClass}>
          {t.footer.contact}
        </Link>
      </div>
    </>
  );
}

export async function SiteFooter() {
  const { t } = await getI18n();

  return (
    <footer className="mt-12 bg-maroon text-ivory">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 pb-8 pt-6 text-center text-sm">
        <Image src={logo} alt={t.site.name} className="h-[88px] w-[180px] object-cover mix-blend-lighten" />
        <Suspense>
          <ShopDetails />
        </Suspense>
      </div>
    </footer>
  );
}
