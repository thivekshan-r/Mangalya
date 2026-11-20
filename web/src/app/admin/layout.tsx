import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-tamil";
import "../globals.css";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Admin", template: "%s | Mangalya admin" },
  robots: { index: false, follow: false }, // keep the admin panel out of search engines
};

export const viewport: Viewport = { themeColor: "#4a0404" };

/**
 * The admin panel's own outermost frame, separate from the customer site's
 * (app/[lang]/layout.tsx). The panel stays in English; the Tamil font is
 * loaded so Tamil product names display properly in the forms.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#f7f2ea] font-sans">{children}</body>
    </html>
  );
}
