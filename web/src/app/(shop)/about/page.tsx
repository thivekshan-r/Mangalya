import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About us",
  description: "Mangalya is a shop in Sri Lanka for photo frames, gift items, and Christian and Hindu ornaments.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="font-serif text-[26px] font-semibold text-maroon md:text-4xl">About Mangalya</h1>

      <div className="mt-4 flex flex-col gap-4 text-ink-soft">
        <p>
          Mangalya is a shop in Sri Lanka for photo frames, gift items, and Christian and Hindu ornaments. We sell to
          families and to other shops, retail and wholesale.
        </p>

        {/* TODO: replace this paragraph with the shop's own story: when it opened, who runs it, what makes it different. */}
        <p>[Your shop&rsquo;s story goes here: when it opened, who runs it, and what customers come to you for.]</p>

        <p>
          You can browse here and order on WhatsApp, or visit us in the shop. For bulk orders, ask us for a wholesale
          quote.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/category/photo-frames" className="flex h-11 items-center rounded-full bg-maroon px-5 font-semibold text-ivory hover:bg-maroon-deep">
          Browse frames
        </Link>
        <Link href="/contact" className="flex h-11 items-center rounded-full border border-maroon px-5 font-semibold text-maroon hover:bg-ivory">
          Contact us
        </Link>
      </div>
    </div>
  );
}
