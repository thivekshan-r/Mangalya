import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-tamil";
import "@fontsource-variable/noto-serif-tamil";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";

const description =
  "Mangalya: photo frames for every occasion, gift items, and Christian and Hindu ornaments. Retail and wholesale. Order on WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description,
  // What a shared link looks like in WhatsApp, Instagram and Facebook.
  openGraph: { type: "website", siteName: SITE_NAME, title: `${SITE_NAME} | ${SITE_TAGLINE}`, description },
};

export const viewport: Viewport = { themeColor: "#4a0404" };

/**
 * The outermost frame, shared by the customer site and the admin panel.
 * The customer header and footer live in (shop)/layout.tsx.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {/* Without JavaScript nothing can trigger the scroll animations, so show everything. */}
        <noscript>
          <style>{".reveal, .reveal .stagger > * { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
