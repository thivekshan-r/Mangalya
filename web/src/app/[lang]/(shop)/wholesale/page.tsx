import type { Metadata } from "next";
import { Suspense } from "react";
import { WholesaleForm } from "@/components/wholesale-form";
import { getProduct, getSettings } from "@/lib/catalogue";
import { alternates } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { text } from "@/lib/site";

type Props = PageProps<"/[lang]/wholesale">;

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getI18n();
  return { title: t.wholesale.title, description: t.wholesale.description, alternates: alternates(lang, "/wholesale") };
}

/** Reads ?product=slug (set by the link on a product page) and starts the form with that product. */
async function Form({ searchParams }: Pick<Props, "searchParams">) {
  const { product: slug } = await searchParams;
  const [settings, detail, { lang }] = await Promise.all([
    getSettings(),
    typeof slug === "string" && slug ? getProduct(slug) : null,
    getI18n(),
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
              description: `${text(product.name, lang)} (${product.code})`,
            }
          : undefined
      }
    />
  );
}

export default async function WholesalePage({ searchParams }: Props) {
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="font-serif text-[26px] font-semibold text-maroon md:text-4xl">{t.wholesale.title}</h1>

      <div className="mt-3 flex flex-col gap-2 text-ink-soft">
        <p>{t.wholesale.intro1}</p>
        <p>{t.wholesale.intro2}</p>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-sand" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
