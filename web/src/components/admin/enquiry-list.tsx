"use client";

import { useEffect, useState } from "react";
import { api, messageOf, type Enquiry, type EnquiryList as List, type EnquiryStatus } from "@/lib/admin-api";
import { ConfirmButton, ErrorNote, card, quietButton, useClearOnLeave } from "./ui";
import { useUser } from "./session";

const FILTERS = [
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const STATUS_STYLE: Record<EnquiryStatus, string> = {
  new: "bg-gold text-maroon-deep",
  replied: "bg-[#e3f1ea] text-[#0b5c47]",
  closed: "bg-sand text-ink",
};

/**
 * A WhatsApp link for the customer's number. Numbers typed the local way
 * (077 123 4567) are assumed to be Sri Lankan and get the 94 country code.
 */
function whatsappFor(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `94${digits.slice(1)}` : digits}`;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function EnquiryList() {
  const user = useUser();
  const [filter, setFilter] = useState<Filter>("new");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<List | null>(null);
  const [problem, setProblem] = useState<string | null>(null); // from a change that failed
  const [loadProblem, setLoadProblem] = useState<string | null>(null); // from loading the list
  const [busyId, setBusyId] = useState<string | null>(null);

  useClearOnLeave(() => setProblem(null));

  // Changing `version` loads the list again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api<List>(`/api/admin/enquiries?status=${filter}&page=${page}`)
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
  }, [filter, page, version]);

  async function change(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setProblem(null);
    try {
      await action();
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setBusyId(null);
      setVersion((current) => current + 1);
    }
  }

  const setStatus = (enquiry: Enquiry, status: EnquiryStatus) =>
    change(enquiry.id, () => api(`/api/admin/enquiries/${enquiry.id}`, { method: "PATCH", body: { status } }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl font-semibold text-maroon">Enquiries</h1>
      <p className="text-sm text-ink-soft">Wholesale requests sent from the website. Reply on WhatsApp or by phone, then mark them as replied.</p>

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
            className={`h-11 shrink-0 rounded-full border px-4 text-sm ${
              filter === item.value ? "border-maroon bg-maroon font-semibold text-ivory" : "border-line-strong bg-white"
            }`}
          >
            {item.label}
            {item.value === "new" && list && list.waiting > 0 ? ` (${list.waiting})` : ""}
          </button>
        ))}
      </div>

      <ErrorNote message={loadProblem} />
      <ErrorNote message={problem} />

      {!list ? (
        !loadProblem && <p className="text-ink-muted">Loading…</p>
      ) : list.items.length === 0 ? (
        <p className={`${card} px-4 py-8 text-center text-ink-soft`}>
          {filter === "new" ? "No new enquiries. You are all caught up." : "Nothing here."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.items.map((enquiry) => (
            <li key={enquiry.id} className={`${card} flex flex-col gap-2 p-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{enquiry.name}</p>
                  <p className="text-sm text-ink-muted">
                    {[enquiry.businessName, enquiry.town].filter(Boolean).join(" · ") || "No business name given"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[enquiry.status]}`}>
                  {enquiry.status}
                </span>
              </div>

              {enquiry.items.length > 0 && (
                <ul className="list-disc pl-5 text-sm">
                  {enquiry.items.map((item, index) => (
                    <li key={index}>
                      {item.quantity} × {item.description}
                    </li>
                  ))}
                </ul>
              )}

              {enquiry.message && <p className="whitespace-pre-line text-sm text-ink-soft">{enquiry.message}</p>}

              <p className="text-[13px] text-ink-muted">
                {formatDate(enquiry.createdAt)} · {enquiry.phone}
              </p>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
                <a href={whatsappFor(enquiry.phone)} className={`${quietButton} border-whatsapp text-whatsapp`}>
                  Reply on WhatsApp
                </a>
                <a href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`} className={quietButton}>
                  Call
                </a>
                {enquiry.status !== "replied" && (
                  <button type="button" disabled={busyId === enquiry.id} onClick={() => setStatus(enquiry, "replied")} className={quietButton}>
                    Mark replied
                  </button>
                )}
                {enquiry.status !== "closed" && (
                  <button type="button" disabled={busyId === enquiry.id} onClick={() => setStatus(enquiry, "closed")} className={quietButton}>
                    Close
                  </button>
                )}
                {enquiry.status !== "new" && (
                  <button type="button" disabled={busyId === enquiry.id} onClick={() => setStatus(enquiry, "new")} className={quietButton}>
                    Mark new
                  </button>
                )}
                {user.role === "owner" && (
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Yes, delete"
                    disabled={busyId === enquiry.id}
                    onConfirm={() => void change(enquiry.id, () => api(`/api/admin/enquiries/${enquiry.id}`, { method: "DELETE" }))}
                  />
                )}
              </div>
            </li>
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
