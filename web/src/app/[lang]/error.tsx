"use client";

import { useI18n } from "@/components/i18n-provider";

/** Shown if a page crashes, instead of a blank screen. */
export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-maroon">{t.error.heading}</h1>
      <p className="mt-2 text-ink-soft">{t.error.text}</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 h-11 rounded-full bg-maroon px-5 font-semibold text-ivory hover:bg-maroon-deep"
      >
        {t.error.retry}
      </button>
    </div>
  );
}
