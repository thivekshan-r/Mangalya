import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/logo.png";
import { getSettings } from "@/lib/catalogue";
import { text } from "@/lib/site";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";

const linkClass = "flex h-11 items-center font-semibold text-gold hover:underline";

async function ShopDetails() {
  const settings = await getSettings();
  const address = text(settings.address);
  const hours = text(settings.openingHours);

  return (
    <>
      {address && <p className="whitespace-pre-line">{address}</p>}
      {hours && <p className="whitespace-pre-line">{hours}</p>}
      <div className="flex flex-wrap justify-center gap-x-6">
        <a href={whatsappLink(settings.whatsappNumber, GENERAL_MESSAGE)} className={linkClass}>
          WhatsApp
        </a>
        {settings.instagramUrl && (
          <a href={settings.instagramUrl} className={linkClass}>
            Instagram
          </a>
        )}
        <Link href="/contact" className={linkClass}>
          Contact
        </Link>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-maroon text-ivory">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 pb-8 pt-6 text-center text-sm">
        <Image src={logo} alt="Mangalya" className="h-[88px] w-[180px] object-cover mix-blend-lighten" />
        <Suspense>
          <ShopDetails />
        </Suspense>
      </div>
    </footer>
  );
}
