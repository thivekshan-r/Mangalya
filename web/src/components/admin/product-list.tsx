"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { refreshSite } from "@/app/admin/actions";
import { api, messageOf, type AdminProduct, type AdminProductList } from "@/lib/admin-api";
import { formatPrice } from "@/lib/site";
import { ConfirmButton, ErrorNote, card, inputClass, primaryButton, quietButton, useClearOnLeave } from "./ui";
import { useUser } from "./session";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "live", label: "On the site" },
  { value: "hidden", label: "Hidden" },
  { value: "deleted", label: "Deleted" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

const PAGE_SIZE = 24;

export function ProductList() {
  const user = useUser();
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // the search text actually sent
  const [page, setPage] = useState(1);
  const [list, setList] = useState<AdminProductList | null>(null);
  const [problem, setProblem] = useState<string | null>(null); // from a change that failed
  const [loadProblem, setLoadProblem] = useState<string | null>(null); // from loading the list
  const [busyId, setBusyId] = useState<string | null>(null);

  useClearOnLeave(() => setProblem(null));

  // Changing `version` loads the list again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ status, page: String(page), limit: String(PAGE_SIZE) });
    if (query) params.set("q", query);

    api<AdminProductList>(`/api/admin/products?${params}`)
      .then((answer) => {
        if (cancelled) return;
        setList(answer);
        setLoadProblem(null);
      })
      .catch((error) => {
        if (!cancelled) setLoadProblem(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [status, page, query, version]);

  /** Runs one change on a product, then reloads the list and refreshes the customer site. */
  async function change(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setProblem(null);
    try {
      await action();
      await refreshSite();
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setBusyId(null);
      setVersion((current) => current + 1);
    }
  }

  function chooseStatus(next: Status) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-maroon">Products</h1>
        <Link href="/admin/products/new" className={primaryButton}>
          Add product
        </Link>
      </div>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
          setPage(1);
        }}
        className="flex gap-2"
      >
        <label htmlFor="product-search" className="sr-only">
          Search products by name or code
        </label>
        <input
          id="product-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or code"
          className={inputClass}
        />
        <button type="submit" className={quietButton}>
          Search
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show">
        {STATUSES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={status === item.value}
            onClick={() => chooseStatus(item.value)}
            className={`h-11 shrink-0 rounded-full border px-4 text-sm ${
              status === item.value ? "border-maroon bg-maroon font-semibold text-ivory" : "border-line-strong bg-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ErrorNote message={loadProblem} />
      <ErrorNote message={problem} />

      {!list ? (
        !loadProblem && <p className="text-ink-muted">Loading…</p>
      ) : list.items.length === 0 ? (
        <p className={`${card} px-4 py-8 text-center text-ink-soft`}>
          {query ? `Nothing found for "${query}".` : status === "deleted" ? "No deleted products." : "No products yet. Add your first one."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.items.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              busy={busyId === product.id}
              isOwner={user.role === "owner"}
              onToggleVisible={() =>
                change(product.id, () =>
                  api(`/api/admin/products/${product.id}`, { method: "PATCH", body: { visible: !product.visible } }),
                )
              }
              onDelete={() => change(product.id, () => api(`/api/admin/products/${product.id}`, { method: "DELETE" }))}
              onRestore={() => change(product.id, () => api(`/api/admin/products/${product.id}/restore`, { method: "POST" }))}
              onDeleteForever={() =>
                change(product.id, () => api(`/api/admin/products/${product.id}?permanent=true`, { method: "DELETE" }))
              }
            />
          ))}
        </ul>
      )}

      {list && list.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={quietButton}>
            Previous
          </button>
          <span className="text-sm text-ink-soft">
            Page {list.page} of {list.pages}
          </span>
          <button type="button" disabled={page >= list.pages} onClick={() => setPage(page + 1)} className={quietButton}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  busy,
  isOwner,
  onToggleVisible,
  onDelete,
  onRestore,
  onDeleteForever,
}: {
  product: AdminProduct;
  busy: boolean;
  isOwner: boolean;
  onToggleVisible: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  const cover = product.images[0];
  const deleted = product.deletedAt !== null;

  return (
    <li className={`${card} flex flex-col gap-2 p-3`}>
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand">
          {cover && <Image src={cover.url} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{product.name.en}</p>
          <p className="text-[13px] text-ink-muted">
            {product.code} · {product.category?.name?.en ?? "No category"} · {formatPrice(product.price)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold">
            {deleted && <span className="rounded-md bg-ink px-2 py-0.5 text-white">Deleted</span>}
            {!deleted && !product.visible && <span className="rounded-md bg-sand px-2 py-0.5">Hidden</span>}
            {!product.inStock && <span className="rounded-md bg-sand px-2 py-0.5">Out of stock</span>}
            {product.featured && <span className="rounded-md bg-ivory px-2 py-0.5 text-maroon">Featured</span>}
            {product.images.length === 0 && <span className="rounded-md bg-sand px-2 py-0.5">No photo</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 border-t border-line pt-2">
        {deleted ? (
          <>
            <button type="button" disabled={busy} onClick={onRestore} className={quietButton}>
              Restore
            </button>
            {isOwner && (
              <ConfirmButton label="Delete for good" confirmLabel="Yes, delete for good" disabled={busy} onConfirm={onDeleteForever} />
            )}
          </>
        ) : (
          <>
            <Link href={`/admin/products/${product.id}`} className={quietButton}>
              Edit
            </Link>
            <button type="button" disabled={busy} onClick={onToggleVisible} className={quietButton}>
              {product.visible ? "Hide" : "Show on site"}
            </button>
            <ConfirmButton label="Delete" confirmLabel="Yes, delete" disabled={busy} onConfirm={onDelete} />
          </>
        )}
      </div>
    </li>
  );
}
