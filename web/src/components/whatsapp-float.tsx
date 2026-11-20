"use client";

import { usePathname } from "next/navigation";
import { splitPath } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { ChatIcon } from "./icons";

/**
 * The round WhatsApp button fixed to the corner of every page.
 * Hidden on product pages, which have their own "Order on WhatsApp" bar in that spot.
 */
export function WhatsAppFloat({ href }: { href: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  if (splitPath(pathname).path.startsWith("/product/")) return null;

  return (
    <a
      href={href}
      aria-label={t.common.chatOnWhatsApp}
      className="ring-pulse fixed bottom-4 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg hover:bg-whatsapp-deep"
    >
      <ChatIcon size={28} />
    </a>
  );
}
