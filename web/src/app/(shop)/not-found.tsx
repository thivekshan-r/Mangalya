import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-maroon">We could not find that page</h1>
      <p className="mt-2 text-ink-soft">The product may have been removed, or the link may be wrong.</p>
      <Link href="/" className="mt-6 flex h-11 items-center rounded-full bg-maroon px-5 font-semibold text-ivory hover:bg-maroon-deep">
        Back to the home page
      </Link>
    </div>
  );
}
