import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadProblem, ProductGrid } from "@/components/product-card";
import { OptionPicker, OrderButton, OrderProvider, ProductGallery } from "@/components/product-view";
import { getProduct, getSettings } from "@/lib/catalogue";
import { formatPrice, text } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";
import type { Product } from "@/lib/types";

type Props = PageProps<"/product/[slug]">;

/** A one-line summary for search results and link previews. */
function summary(product: Product): string {
  const description = text(product.description).replace(/\s+/g, " ").trim();
  if (description) return description.length > 155 ? `${description.slice(0, 152)}...` : description;

  return `${text(product.name)} from Mangalya. ${formatPrice(product.price)}. Order on WhatsApp.`;
}

/** The title, description and photo shown when this page is shared or found in a search. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProduct(slug);
  // Shows the "not found" page, which also tells search engines not to list this address.
  if (detail === "not-found") notFound();
  if (!detail) return { title: "Product" };

  const { product } = detail;
  const title = text(product.name);
  const description = summary(product);

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${product.slug}`,
      images: product.images.slice(0, 1).map((image) => ({ url: image.url, alt: image.alt || title })),
    },
  };
}

/** Product details in the format search engines read (schema.org). */
function StructuredData({ product, url }: { product: Product; url: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: text(product.name),
    sku: product.code,
    description: text(product.description) || undefined,
    image: product.images.map((image) => image.url),
    category: product.category ? text(product.category.name) : undefined,
    brand: { "@type": "Brand", name: "Mangalya" },
    offers:
      product.price === null
        ? undefined
        : {
            "@type": "Offer",
            url,
            price: product.price,
            priceCurrency: "LKR",
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
  };

  // "<" is escaped so product text can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

async function ProductDetails({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getProduct(slug), getSettings()]);

  if (detail === "not-found") notFound();
  if (!detail) {
    return (
      <div className="px-4 pt-6 md:px-6">
        <LoadProblem />
      </div>
    );
  }

  const { product, related } = detail;
  const url = `${SITE_URL}/product/${product.slug}`;
  const description = text(product.description);

  return (
    <OrderProvider product={product} whatsappNumber={settings.whatsappNumber} productUrl={url}>
      <StructuredData product={product} url={url} />

      <div className="md:grid md:grid-cols-2 md:gap-10 md:px-6 md:pt-6">
        <ProductGallery product={product} />

        <div className="px-4 pt-4 md:px-0 md:pt-0">
          {product.category && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-ink-muted">
              <Link href="/" className="flex h-8 items-center text-maroon hover:underline">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <Link href={`/category/${product.category.slug}`} className="flex h-8 items-center text-maroon hover:underline">
                {text(product.category.name)}
              </Link>
            </nav>
          )}

          <h1 className="font-serif text-2xl font-semibold leading-tight text-maroon md:text-4xl">{text(product.name)}</h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">Code: {product.code}</p>

          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-[22px] font-semibold">{formatPrice(product.price)}</span>
            {product.inStock ? (
              <span className="rounded-md bg-[#e3f1ea] px-2.5 py-0.5 text-[13px] font-semibold text-[#0b5c47]">In stock</span>
            ) : (
              <span className="rounded-md bg-ink px-2.5 py-0.5 text-[13px] font-semibold text-white">Out of stock</span>
            )}
          </div>

          <OptionPicker />

          <div className="mt-6 hidden md:block">
            <OrderButton />
          </div>

          {description && (
            <section className="mt-6">
              <h2 className="mb-1.5 font-semibold">About this item</h2>
              <p className="whitespace-pre-line text-ink-soft">{description}</p>
            </section>
          )}

          <section className="mt-5 flex flex-wrap items-center justify-between gap-x-3 rounded-xl border border-gold-soft bg-white px-4 py-1.5">
            <p className="text-sm">Buying in bulk?</p>
            <Link href={`/wholesale?product=${product.slug}`} className="flex h-11 items-center text-sm font-semibold text-maroon underline">
              Ask for a wholesale quote
            </Link>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="px-4 pt-8 md:px-6">
          <h2 className="mb-3 font-serif text-xl font-semibold text-maroon">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}

      {/* On phones the order button stays at the bottom of the screen while the customer reads. */}
      <div className="sticky bottom-0 z-20 mt-8 border-t border-line bg-white px-4 pb-4 pt-3 md:hidden">
        <OrderButton />
      </div>
    </OrderProvider>
  );
}

export default function ProductPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<div className="aspect-square animate-pulse bg-sand md:m-6 md:aspect-auto md:h-96 md:rounded-2xl" />}>
        <ProductDetails params={params} />
      </Suspense>
    </div>
  );
}
