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
 * The message sent by the "Order on WhatsApp" button.
 * `productUrl` is the full address of the product page, so the shop can open it from the chat.
 */
export function orderMessage(product: Product, chosen: Record<string, string>, productUrl: string): string {
  const lines = [
    "Hello Mangalya, I would like to order:",
    "",
    `*${text(product.name)}*`,
    `Code: ${product.code}`,
    ...product.options
      .filter((option) => chosen[option.name])
      .map((option) => `${option.name}: ${chosen[option.name]}`),
    `Price: ${formatPrice(product.price)}`,
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
export function wholesaleMessage(details: WholesaleDetails): string {
  const lines = ["Hello Mangalya, I would like a wholesale quote.", "", `Name: ${details.name}`];

  if (details.businessName) lines.push(`Business: ${details.businessName}`);
  if (details.town) lines.push(`Town: ${details.town}`);
  lines.push(`Phone: ${details.phone}`);

  if (details.items.length > 0) {
    lines.push("", "Products:", ...details.items.map((item) => `- ${item.quantity} × ${item.description}`));
  }
  if (details.message) lines.push("", details.message);

  return lines.join("\n");
}

export const GENERAL_MESSAGE = "Hello Mangalya, I have a question.";
