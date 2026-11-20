import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-tamil";
import "@fontsource-variable/noto-serif-tamil";
import "../globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { LANGS, LANG_TAGS } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { SITE_URL } from "@/lib/site-url";

/** Build every customer page in both languages. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getI18n();
  const title = `${t.site.name} | ${t.site.tagline}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${t.site.name}` },
    description: t.site.description,
    // What a shared link looks like in WhatsApp, Instagram and Facebook.
    openGraph: {
      type: "website",
      siteName: t.site.name,
      title,
      description: t.site.description,
      locale: LANG_TAGS[lang].openGraph,
    },
  };
}

export const viewport: Viewport = { themeColor: "#4a0404" };

/** The outermost frame of the customer site. The admin panel has its own (app/admin/layout.tsx). */
export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { lang } = await getI18n();

  return (
    <html lang={LANG_TAGS[lang].html} className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {/* Without JavaScript nothing can trigger the scroll animations, so show everything. */}
        <noscript>
          <style>{".reveal, .reveal .stagger > * { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
