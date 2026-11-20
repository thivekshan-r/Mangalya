"use client";

import Image from "next/image";
import { createContext, useContext, useState } from "react";
import { text } from "@/lib/site";
import type { Product } from "@/lib/types";
import { orderMessage, whatsappLink } from "@/lib/whatsapp";
import { useI18n } from "./i18n-provider";
import { ChatIcon } from "./icons";
import { PhotoPlaceholder } from "./product-card";

/** The product's photos: one large photo and a row of thumbnails to switch between them. */
export function ProductGallery({ product }: { product: Product }) {
  const { lang, t } = useI18n();
  const [current, setCurrent] = useState(0);
  const name = text(product.name, lang);
  const photo = product.images[current];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-sand md:rounded-2xl">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.alt || name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>

      {product.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 md:px-0">
          {product.images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              aria-label={t.product.photo(index + 1)}
              aria-pressed={index === current}
              onClick={() => setCurrent(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                index === current ? "border-maroon" : "border-transparent"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Order = {
  product: Product;
  chosen: Record<string, string>;
  choose: (option: string, value: string) => void;
  /** The WhatsApp link, with the current choices in its message. */
  href: string;
};

const OrderContext = createContext<Order | null>(null);

function useOrder(): Order {
  const order = useContext(OrderContext);
  if (!order) throw new Error("Use this component inside <OrderProvider>");
  return order;
}

/**
 * Remembers which options (size, colour...) the customer has chosen, so the
 * option buttons and the order buttons on the page all agree.
 */
export function OrderProvider({
  product,
  whatsappNumber,
  productUrl,
  children,
}: {
  product: Product;
  whatsappNumber: string;
  /** Full address of this product page, included in the WhatsApp message. */
  productUrl: string;
  children: React.ReactNode;
}) {
  const { lang } = useI18n();

  // Start with the first value of each option chosen.
  const [chosen, setChosen] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.options.map((option) => [option.name, option.values[0] ?? ""])),
  );

  const order: Order = {
    product,
    chosen,
    choose: (option, value) => setChosen({ ...chosen, [option]: value }),
    href: whatsappLink(whatsappNumber, orderMessage(product, chosen, productUrl, lang)),
  };

  return <OrderContext value={order}>{children}</OrderContext>;
}

/** The option buttons. */
export function OptionPicker() {
  const { product, chosen, choose } = useOrder();

  return product.options.map((option) => (
    <fieldset key={option.name} className="mt-5">
      <legend className="mb-2 font-semibold">{option.name}</legend>
      <div className="flex flex-wrap gap-2">
        {option.values.map((value) => {
          const selected = chosen[option.name] === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(option.name, value)}
              className={`h-11 rounded-[10px] border px-4 ${
                selected
                  ? "border-maroon bg-maroon font-semibold text-ivory"
                  : "border-line-strong bg-white hover:border-maroon"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </fieldset>
  ));
}

/** The "Order on WhatsApp" button. Its message includes the chosen options. */
export function OrderButton() {
  const { product, href } = useOrder();
  const { t } = useI18n();

  return (
    <a
      href={href}
      className="flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-whatsapp text-base font-semibold text-white hover:bg-whatsapp-deep"
    >
      <ChatIcon size={22} />
      {product.inStock && product.price !== null ? t.product.order : t.product.ask}
    </a>
  );
}
