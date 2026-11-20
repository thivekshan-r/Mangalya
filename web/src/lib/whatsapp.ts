import { DICTIONARIES } from "./dictionaries";
import type { Lang } from "./i18n";
import { formatPrice, text } from "./site";
import type { Product } from "./types";

/**
 * WhatsApp "click to chat" link: opens a chat with the shop with the message
 * already typed. Without a number, WhatsApp asks the customer who to send it to.
 */
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

/**
 * The message sent by the "Order on WhatsApp" button, in the language the
 * customer is reading. The product code is always included, so the shop can
 * find the item whichever language the message is in.
 * `productUrl` is the full address of the product page.
 */
export function orderMessage(product: Product, chosen: Record<string, string>, productUrl: string, lang: Lang = "en"): string {
  const t = DICTIONARIES[lang].whatsapp;

  const lines = [
    t.orderIntro,
    "",
    `*${text(product.name, lang)}*`,
    `${t.code}: ${product.code}`,
    ...product.options
      .filter((option) => chosen[option.name])
      .map((option) => `${option.name}: ${chosen[option.name]}`),
    `${t.price}: ${formatPrice(product.price, lang)}`,
    "",
    productUrl,
  ];

  return lines.join("\n");
}

export type WholesaleDetails = {
  name: string;
  businessName: string;
  town: string;
  phone: string;
  items: { description: string; quantity: number }[];
  message: string;
};

/** The WhatsApp version of a filled-in wholesale form. Empty answers are left out. */
export function wholesaleMessage(details: WholesaleDetails, lang: Lang = "en"): string {
  const t = DICTIONARIES[lang].whatsapp;
  const lines = [t.wholesaleIntro, "", `${t.name}: ${details.name}`];

  if (details.businessName) lines.push(`${t.business}: ${details.businessName}`);
  if (details.town) lines.push(`${t.town}: ${details.town}`);
  lines.push(`${t.phone}: ${details.phone}`);

  if (details.items.length > 0) {
    lines.push("", `${t.products}:`, ...details.items.map((item) => `- ${item.quantity} × ${item.description}`));
  }
  if (details.message) lines.push("", details.message);

  return lines.join("\n");
}
