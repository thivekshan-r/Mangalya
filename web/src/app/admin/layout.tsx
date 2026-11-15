import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Mangalya admin" },
  robots: { index: false, follow: false }, // keep the admin panel out of search engines
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex flex-1 flex-col bg-[#f7f2ea]">{children}</div>;
}
