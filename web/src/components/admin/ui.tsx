"use client";

import { useLayoutEffect, useState } from "react";

/** Small building blocks shared by the admin screens. */

/**
 * Next.js keeps a page's state when you leave it and come back, which is
 * right for drafts but wrong for messages. This clears a message (or any
 * state) when the page is left, so "Saved" or an old error is not still
 * showing on the next visit.
 */
export function useClearOnLeave(clear: () => void) {
  useLayoutEffect(() => clear, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs only when the page is hidden
}

export const inputClass =
  "h-12 w-full rounded-[10px] border border-line-strong bg-white px-3 outline-none focus:border-maroon disabled:bg-sand";

export const primaryButton =
  "flex h-12 items-center justify-center rounded-full bg-maroon px-6 font-semibold text-ivory hover:bg-maroon-deep disabled:opacity-60";

export const quietButton =
  "flex h-11 items-center justify-center rounded-[10px] border border-line-strong bg-white px-4 font-semibold hover:border-maroon disabled:opacity-60";

export const card = "rounded-xl border border-line bg-white";

/** A label with its input underneath, and an optional hint. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}

/** A row with a label and a tick box, used for on/off settings. */
export function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-14 items-center justify-between gap-4 border-b border-line px-3.5 last:border-0">
      <span className="font-medium">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-6 w-6 accent-maroon"
      />
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-[#e0b4ae] bg-[#fdf0ee] px-3.5 py-3 text-[#8a1c13]">
      {message}
    </p>
  );
}

export function SavedNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-[10px] border border-[#b7d9c8] bg-[#e9f5ef] px-3.5 py-3 text-[#0b5c47]">
      {message}
    </p>
  );
}

/**
 * A delete button that asks for a second tap before doing anything,
 * so a slip of the thumb cannot remove a product.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className="h-11 px-2 font-semibold text-[#a3221a]">
        {label}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className="h-11 rounded-[10px] bg-[#a3221a] px-4 font-semibold text-white"
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="h-11 px-2 font-semibold">
        Cancel
      </button>
    </span>
  );
}
