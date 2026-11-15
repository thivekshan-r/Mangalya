"use client";

import { useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";

/**
 * The phone menu: a button that opens a panel under the header.
 * The links themselves are rendered on the server and passed in as children.
 */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center text-gold"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          // Close the menu when any link inside it is tapped.
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className="absolute inset-x-0 top-16 z-40 flex flex-col border-t border-maroon-soft bg-maroon-deep px-4 py-2 shadow-lg"
        >
          {children}
        </nav>
      )}
    </div>
  );
}
