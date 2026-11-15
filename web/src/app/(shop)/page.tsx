import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PhotoPlaceholder, LoadProblem, ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { SearchBox } from "@/components/search-box";
import { getCategories, getProducts, getSettings } from "@/lib/catalogue";
import { instagramHandle, text } from "@/lib/site";
import type { ProductQuery } from "@/lib/types";
import { WHOLESALE_MESSAGE, whatsappLink } from "@/lib/whatsapp";

const heading = "font-serif text-xl font-semibold text-maroon";

async function CategoryTiles() {
  const categories = await getCategories();
  if (!categories) return <LoadProblem />;

  return (
    <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
      {categories
        .filter((category) => !category.parent)
        .map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="lift flex flex-col overflow-hidden rounded-xl border border-line bg-white hover:border-gold-soft"
          >
            <div className="relative h-[120px] overflow-hidden md:h-40">
              {category.image ? (
                <Image src={category.image.url} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="zoom object-cover" />
              ) : (
                <PhotoPlaceholder label="" />
              )}
            </div>
            <span className="flex min-h-11 items-center px-3 py-1 font-semibold">{text(category.name)}</span>
          </Link>
        ))}
    </div>
  );
}

async function ProductRow({ query }: { query: ProductQuery }) {
  const list = await getProducts(query);
  if (!list) return <LoadProblem />;
  if (list.items.length === 0) return <p className="text-ink-soft">New products are on their way.</p>;

  return <ProductGrid products={list.items} />;
}

async function WholesaleCard() {
  const settings = await getSettings();

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-gold-soft bg-white p-[18px] md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="font-serif text-lg font-semibold text-maroon">Buying for a shop or an event?</h2>
        <p className="mt-1 text-sm text-ink-soft">Send us your list and we will reply with a wholesale quote.</p>
      </div>
      <a
        href={whatsappLink(settings.whatsappNumber, WHOLESALE_MESSAGE)}
        className="flex h-11 items-center self-start font-semibold text-maroon underline md:self-auto"
      >
        Ask for wholesale prices
      </a>
    </section>
  );
}

async function InstagramCard() {
  const settings = await getSettings();
  if (!settings.instagramUrl) return null;

  return (
    <section className="flex flex-col gap-2 rounded-xl bg-sand p-[18px] md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className={heading}>On Instagram</h2>
        <p className="mt-1 text-sm text-ink-soft">See new arrivals and custom orders as we post them.</p>
      </div>
      <a href={settings.instagramUrl} className="flex h-11 items-center self-start font-semibold text-maroon underline md:self-auto">
        Follow {instagramHandle(settings.instagramUrl)}
      </a>
    </section>
  );
}

/** Sets the order in which the banner lines appear. */
const step = (value: number) => ({ "--step": value }) as React.CSSProperties;

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-4 md:px-6 md:pt-6">
      <div className="md:hidden">
        <SearchBox />
      </div>

      <section className="flex flex-col justify-center gap-2.5 overflow-hidden rounded-2xl border border-maroon-soft bg-maroon p-6 md:min-h-72 md:p-12">
        <p className="rise text-xs font-semibold uppercase tracking-[0.12em] text-gold" style={step(0)}>
          Retail and wholesale
        </p>
        <h1 className="rise font-serif text-[28px] font-semibold leading-tight text-ivory md:text-5xl" style={step(1)}>
          Frames for every occasion
        </h1>
        <span aria-hidden="true" className="draw block h-0.5 w-24 rounded-full bg-gold md:w-36" style={step(3)} />
        <p className="rise max-w-md text-[#f0dcc0] md:text-lg" style={step(2)}>
          Photo frames, gift items, and Christian and Hindu ornaments.
        </p>
        <Link
          href="/category/photo-frames"
          className="rise mt-1.5 flex h-11 items-center self-start rounded-full bg-gold px-5 font-semibold text-maroon-deep transition-[background-color,scale] hover:scale-[1.04] hover:bg-gold-soft active:scale-[0.98]"
          style={step(4)}
        >
          Browse frames
        </Link>
      </section>

      <Reveal>
        <section>
          <h2 className={`${heading} mb-3`}>Shop by category</h2>
          <Suspense fallback={<div className="h-[164px] animate-pulse rounded-xl bg-sand" />}>
            <CategoryTiles />
          </Suspense>
        </section>
      </Reveal>

      <Reveal>
        <section>
          <h2 className={`${heading} mb-3`}>Featured</h2>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductRow query={{ featured: true, limit: 4 }} />
          </Suspense>
        </section>
      </Reveal>

      <Reveal>
        <Suspense>
          <WholesaleCard />
        </Suspense>
      </Reveal>

      <Reveal>
        <section>
          <h2 className={`${heading} mb-3`}>New arrivals</h2>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductRow query={{ limit: 4 }} />
          </Suspense>
        </section>
      </Reveal>

      <Reveal>
        <Suspense>
          <InstagramCard />
        </Suspense>
      </Reveal>
    </div>
  );
}
