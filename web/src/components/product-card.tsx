import Image from "next/image";
import Link from "next/link";
import { formatPrice, text } from "@/lib/site";
import type { Product } from "@/lib/types";
import { FrameIcon } from "./icons";

/** Shown in place of a photo until the shop uploads one. */
export function PhotoPlaceholder({ label = "Photo coming soon" }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-sand text-xs text-ink-muted">
      <FrameIcon size={28} />
      {label}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const cover = product.images[0];
  const name = text(product.name);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="lift flex flex-col overflow-hidden rounded-xl border border-line bg-white text-ink hover:border-gold-soft"
    >
      <div className="relative aspect-square overflow-hidden">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt || name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="zoom object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3 pt-2.5">
        <span className="text-sm font-medium">{name}</span>
        <span className="font-semibold text-maroon">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}

const GRID = "stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className={GRID}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** Grey boxes in the shape of the grid, shown while products load. */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="aspect-square animate-pulse bg-sand" />
          <div className="h-[68px]" />
        </div>
      ))}
    </div>
  );
}

/** Shown when the catalogue cannot be loaded. */
export function LoadProblem() {
  return (
    <p role="status" className="rounded-xl border border-line bg-white px-4 py-6 text-center text-ink-soft">
      We could not load this right now. Please try again in a moment, or message us on WhatsApp.
    </p>
  );
}
