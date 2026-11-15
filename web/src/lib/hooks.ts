"use client";

import { useLayoutEffect } from "react";

/**
 * Next.js keeps a page's state when you leave it and come back, which is
 * right for drafts but wrong for messages. This clears a message (or any
 * state) when the page is left, so "Saved" or an old error is not still
 * showing on the next visit.
 */
export function useClearOnLeave(clear: () => void) {
  useLayoutEffect(() => clear, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs only when the page is hidden
}
