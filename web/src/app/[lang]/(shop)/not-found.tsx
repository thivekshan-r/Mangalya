import Link from "next/link";
import { getI18n } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t, path } = await getI18n();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-maroon">{t.notFound.heading}</h1>
      <p className="mt-2 text-ink-soft">{t.notFound.text}</p>
      <Link href={path("/")} className="mt-6 flex h-11 items-center rounded-full bg-maroon px-5 font-semibold text-ivory hover:bg-maroon-deep">
        {t.notFound.home}
      </Link>
    </div>
  );
}
