import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/assets/logo.png";
import { getCategories } from "@/lib/catalogue";
import { text } from "@/lib/site";
import { SearchIcon } from "./icons";
import { MobileMenu } from "./mobile-menu";

const linkStyle = {
  mobile: "flex min-h-11 items-center border-b border-maroon-soft/60 text-ivory last:border-0",
  desktop: "flex h-11 items-center text-sm font-medium text-ivory hover:text-gold",
};

/** The menu links. Categories come from the catalogue, so new ones appear on their own. */
async function NavLinks({ variant }: { variant: keyof typeof linkStyle }) {
  const categories = (await getCategories()) ?? [];
  const className = linkStyle[variant];

  return (
    <>
      {categories
        .filter((category) => !category.parent)
        .map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`} className={className}>
            {text(category.name)}
          </Link>
        ))}
      <Link href="/wholesale" className={className}>
        Wholesale
      </Link>
      <Link href="/about" className={className}>
        About
      </Link>
      <Link href="/contact" className={className}>
        Contact
      </Link>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-30 bg-maroon">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-2 md:px-6">
        <MobileMenu>
          <Suspense>
            <NavLinks variant="mobile" />
          </Suspense>
        </MobileMenu>

        <Link href="/" aria-label="Mangalya home" className="flex shrink-0">
          {/* The logo has its own maroon background; "lighten" blends it into the header. */}
          <Image src={logo} alt="Mangalya" priority className="h-[52px] w-[106px] object-cover mix-blend-lighten" />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <Suspense>
            <NavLinks variant="desktop" />
          </Suspense>
        </nav>

        <Link href="/search" aria-label="Search" className="flex h-11 w-11 items-center justify-center text-gold">
          <SearchIcon />
        </Link>
      </div>
    </header>
  );
}
