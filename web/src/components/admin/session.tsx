"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api, messageOf, type AdminUser, ApiError, type EnquiryList } from "@/lib/admin-api";
import { ErrorNote } from "./ui";

const UserContext = createContext<AdminUser | null>(null);

/** The logged-in user. Only for components inside the admin panel. */
export function useUser(): AdminUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside the admin panel");
  return user;
}

const LINKS = [
  { href: "/admin", label: "Products", ownerOnly: false },
  { href: "/admin/categories", label: "Categories", ownerOnly: false },
  { href: "/admin/enquiries", label: "Enquiries", ownerOnly: false },
  { href: "/admin/settings", label: "Shop settings", ownerOnly: false },
  { href: "/admin/staff", label: "Staff", ownerOnly: true },
];

/**
 * The frame around every admin screen. It asks the API who is logged in;
 * if nobody is, it sends the visitor to the login page. The API also checks
 * the login on every request, so this is for convenience, not security.
 */
export function AdminPanel({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  /** Enquiries nobody has replied to yet, shown as a number on the Enquiries tab. */
  const [waiting, setWaiting] = useState(0);

  // Re-count the waiting enquiries whenever the admin moves to another screen.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    api<EnquiryList>("/api/admin/enquiries?status=new&limit=1")
      .then((list) => {
        if (!cancelled) setWaiting(list.waiting);
      })
      .catch(() => undefined); // the tab simply shows no number

    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  useEffect(() => {
    let cancelled = false;

    api<{ user: AdminUser }>("/api/auth/me")
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) router.replace("/admin/login");
        else setProblem(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // A full page load, not a quiet navigation, so nothing the last person typed stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is intended here
    window.location.href = "/admin/login";
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        {problem ? <ErrorNote message={problem} /> : <p className="text-center text-ink-muted">Loading…</p>}
      </div>
    );
  }

  const isCurrent = (href: string) =>
    href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/products") : pathname.startsWith(href);

  return (
    <UserContext value={user}>
      <header className="bg-maroon text-ivory">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <p className="font-serif text-lg font-semibold text-gold">Mangalya admin</p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="flex h-11 items-center underline">
              View site
            </Link>
            <Link href="/admin/account" className="flex h-11 items-center underline">
              My account
            </Link>
            <button type="button" onClick={logOut} className="h-11 underline">
              Log out
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2">
          {LINKS.filter((link) => !link.ownerOnly || user.role === "owner").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className={`flex h-11 shrink-0 items-center border-b-[3px] px-3 font-medium ${
                isCurrent(link.href) ? "border-gold text-gold" : "border-transparent text-ivory"
              }`}
            >
              {link.label}
              {link.href === "/admin/enquiries" && waiting > 0 && (
                <span className="ml-1.5 rounded-full bg-gold px-1.5 text-xs font-bold text-maroon-deep" aria-label={`${waiting} waiting`}>
                  {waiting}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-5">{children}</div>
    </UserContext>
  );
}
