import type { Metadata } from "next";
import Link from "next/link";
import { alternates } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getI18n();
  return { title: t.about.title, description: t.about.description, alternates: alternates(lang, "/about") };
}

/** The shop's story. The words are in src/lib/dictionaries.ts, under "about". */
export default async function AboutPage() {
  const { t, path } = await getI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="font-serif text-[26px] font-semibold text-maroon md:text-4xl">{t.about.heading}</h1>

      <div className="mt-4 flex flex-col gap-4 text-ink-soft">
        <p>{t.about.p1}</p>
        <p>{t.about.p2}</p>
        <p>{t.about.p3}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={path("/category/photo-frames")} className="flex h-11 items-center rounded-full bg-maroon px-5 font-semibold text-ivory hover:bg-maroon-deep">
          {t.about.browse}
        </Link>
        <Link href={path("/contact")} className="flex h-11 items-center rounded-full border border-maroon px-5 font-semibold text-maroon hover:bg-ivory">
          {t.about.contact}
        </Link>
      </div>
    </div>
  );
}
