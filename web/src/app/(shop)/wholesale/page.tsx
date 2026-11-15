import type { Metadata } from "next";
import { Suspense } from "react";
import { WholesaleForm } from "@/components/wholesale-form";
import { getProduct, getSettings } from "@/lib/catalogue";
import { text } from "@/lib/site";

type Props = PageProps<"/wholesale">;

export const metadata: Metadata = {
  title: "Wholesale",
  description: "Wholesale photo frames, gift items and ornaments from Mangalya. Send your list and we will reply with a quote.",
  alternates: { canonical: "/wholesale" },
};

/** Reads ?product=slug (set by the link on a product page) and starts the form with that product. */
async function Form({ searchParams }: Pick<Props, "searchParams">) {
  const { product: slug } = await searchParams;
  const [settings, detail] = await Promise.all([
    getSettings(),
    typeof slug === "string" && slug ? getProduct(slug) : null,
  ]);

  const product = detail && detail !== "not-found" ? detail.product : null;

  return (
    <WholesaleForm
      whatsappNumber={settings.whatsappNumber}
      firstItem={
        product
          ? {
              // Only real database ids are sent on; the sample catalogue's ids are not.
              product: /^[a-f0-9]{24}$/i.test(product.id) ? product.id : null,
              description: `${text(product.name)} (${product.code})`,
            }
          : undefined
      }
    />
  );
}

export default function WholesalePage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="font-serif text-[26px] font-semibold text-maroon md:text-4xl">Wholesale</h1>

      <div className="mt-3 flex flex-col gap-2 text-ink-soft">
        <p>
          We supply photo frames, gift items and ornaments to shops, studios, churches, temples and event organisers.
        </p>
        <p>Tell us what you need and how many. We will reply with prices and delivery times.</p>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-sand" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
