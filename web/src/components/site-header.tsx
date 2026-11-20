import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/logo.png";
import { getCategories } from "@/lib/catalogue";
import { getI18n } from "@/lib/i18n-server";
import { text } from "@/lib/site";
import { SearchIcon } from "./icons";
import { LanguageSwitch } from "./language-switch";
import { MobileMenu } from "./mobile-menu";

const linkStyle = {
  mobile: "flex min-h-11 items-center border-b border-maroon-soft/60 text-ivory last:border-0",
  desktop: "flex h-11 items-center text-sm font-medium text-ivory hover:text-gold",
};

/** The menu links. Categories come from the catalogue, so new ones appear on their own. */
async function NavLinks({ variant }: { variant: keyof typeof linkStyle }) {
  const [categories, { lang, t, path }] = await Promise.all([getCategories(), getI18n()]);
  const className = linkStyle[variant];

  return (
    <>
      {(categories ?? [])
        .filter((category) => !category.parent)
        .map((category) => (
          <Link key={category.id} href={path(`/category/${category.slug}`)} className={className}>
            {text(category.name, lang)}
          </Link>
        ))}
      <Link href={path("/wholesale")} className={className}>
        {t.nav.wholesale}
      </Link>
      <Link href={path("/about")} className={className}>
        {t.nav.about}
      </Link>
      <Link href={path("/contact")} className={className}>
        {t.nav.contact}
      </Link>
    </>
  );
}

export async function SiteHeader() {
  const { lang, t, path } = await getI18n();
  // Tamil menu words are much longer, so on big screens the Tamil menu gets its own row under the logo.
  const ownRow = lang === "ta";

  const menu = (
    <nav
      aria-label={t.nav.main}
      className={
        ownRow
          ? "mx-auto hidden max-w-6xl flex-wrap items-center justify-center gap-x-6 px-6 pb-2 lg:flex"
          : "hidden flex-1 items-center justify-center gap-x-5 whitespace-nowrap lg:flex"
      }
    >
      <Suspense>
        <NavLinks variant="desktop" />
      </Suspense>
    </nav>
  );

  return (
    <header className="relative z-30 bg-maroon">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-2 md:px-6">
        <MobileMenu>
          <Suspense>
            <NavLinks variant="mobile" />
          </Suspense>
        </MobileMenu>

        <Link href={path("/")} aria-label={t.nav.home} className="flex shrink-0">
          {/* The logo has its own maroon background; "lighten" blends it into the header. */}
          <Image src={logo} alt={t.site.name} priority className="h-[52px] w-[106px] object-cover mix-blend-lighten" />
        </Link>

        {!ownRow && menu}

        <div className="flex items-center">
          <Suspense>
            <LanguageSwitch />
          </Suspense>
          <Link href={path("/search")} aria-label={t.nav.search} className="flex h-11 w-11 items-center justify-center text-gold">
            <SearchIcon />
          </Link>
        </div>
      </div>
      {ownRow && menu}
    </header>
  );
}
