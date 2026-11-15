"use client";

/** Shown if a page crashes, instead of a blank screen. */
export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-maroon">Something went wrong</h1>
      <p className="mt-2 text-ink-soft">Please try again. If it keeps happening, message us on WhatsApp.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 h-11 rounded-full bg-maroon px-5 font-semibold text-ivory hover:bg-maroon-deep"
      >
        Try again
      </button>
    </div>
  );
}
