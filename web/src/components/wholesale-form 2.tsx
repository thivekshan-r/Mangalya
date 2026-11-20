"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/admin-api";
import { useClearOnLeave } from "@/lib/hooks";
import { wholesaleMessage, whatsappLink, type WholesaleDetails } from "@/lib/whatsapp";
import { ChatIcon } from "./icons";

type Row = { product: string | null; description: string; quantity: string };

const field = "h-12 rounded-[10px] border border-line-strong bg-white px-3 outline-none focus:border-maroon";
const input = `${field} w-full`;
const label = "font-semibold";

const emptyRow = (): Row => ({ product: null, description: "", quantity: "" });

/**
 * The wholesale enquiry form. Sending it saves the enquiry for the shop
 * (so nothing is lost if the customer never opens WhatsApp) and then offers
 * the same details as a ready-made WhatsApp message.
 */
export function WholesaleForm({
  whatsappNumber,
  firstItem,
}: {
  whatsappNumber: string;
  /** A product to start the list with, when the customer came from a product page. */
  firstItem?: { product: string | null; description: string };
}) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [town, setTown] = useState("");
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [firstItem ? { ...firstItem, quantity: "" } : emptyRow()]);
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** Set once the form has been sent: the WhatsApp link, and whether the shop's copy was saved. */
  const [sent, setSent] = useState<{ href: string; saved: boolean } | null>(null);

  useClearOnLeave(() => {
    setSent(null);
    setProblem(null);
  });

  const setRow = (index: number, change: Partial<Row>) =>
    setRows(rows.map((row, position) => (position === index ? { ...row, ...change } : row)));

  async function send(event: React.FormEvent) {
    event.preventDefault();

    const details: WholesaleDetails = {
      name: name.trim(),
      businessName: businessName.trim(),
      town: town.trim(),
      phone: phone.trim(),
      items: rows
        .filter((row) => row.description.trim())
        .map((row) => ({ description: row.description.trim(), quantity: Math.max(1, Number.parseInt(row.quantity, 10) || 1) })),
      message: message.trim(),
    };
    const products = rows.filter((row) => row.description.trim()).map((row) => row.product);
    const href = whatsappLink(whatsappNumber, wholesaleMessage(details));

    setSending(true);
    setProblem(null);

    let saved = true;
    try {
      await api("/api/enquiries", {
        body: { ...details, items: details.items.map((item, index) => ({ ...item, product: products[index] ?? null })) },
      });
    } catch (error) {
      // Something in the form is wrong: say what, and let the customer fix it.
      if (error instanceof ApiError && error.status === 400) {
        setProblem(error.fields.map((field) => field.message).join(". ") || error.message);
        setSending(false);
        return;
      }
      // Anything else (no connection, server busy): the WhatsApp message still works.
      saved = false;
    }

    // Clear the form, so coming back to this page starts a new enquiry.
    setName("");
    setBusinessName("");
    setTown("");
    setPhone("");
    setRows([emptyRow()]);
    setMessage("");
    setSending(false);
    setSent({ href, saved });
    window.scrollTo({ top: 0 });
  }

  if (sent) {
    return (
      <div role="status" className="rounded-xl border border-gold-soft bg-white p-5 text-center">
        <h2 className="font-serif text-xl font-semibold text-maroon">
          {sent.saved ? "Thank you. We have your enquiry." : "One more step"}
        </h2>
        <p className="mt-2 text-ink-soft">
          {sent.saved
            ? "We will reply with a quote. To get an answer sooner, send us the same details on WhatsApp."
            : "We could not save your enquiry here, so please send it to us on WhatsApp. Your details are already typed in."}
        </p>
        <a
          href={sent.href}
          className="mt-4 flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-whatsapp font-semibold text-white hover:bg-whatsapp-deep"
        >
          <ChatIcon size={22} />
          Send on WhatsApp
        </a>
        <button type="button" onClick={() => setSent(null)} className="mt-2 h-11 font-semibold text-maroon underline">
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      {problem && (
        <p role="alert" className="rounded-[10px] border border-[#e0b4ae] bg-[#fdf0ee] px-3.5 py-3 text-[#8a1c13]">
          {problem}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ws-name" className={label}>
          Your name
        </label>
        <input id="ws-name" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className={input} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ws-business" className={label}>
            Shop or business name
          </label>
          <input id="ws-business" autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={150} className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ws-town" className={label}>
            Town
          </label>
          <input id="ws-town" autoComplete="address-level2" value={town} onChange={(event) => setTown(event.target.value)} maxLength={100} className={input} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ws-phone" className={label}>
          Phone or WhatsApp number
        </label>
        <input id="ws-phone" required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} className={input} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-1.5`}>What would you like, and how many?</legend>

        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <label htmlFor={`ws-item-${index}`} className="sr-only">
              Product {index + 1}
            </label>
            <input
              id={`ws-item-${index}`}
              value={row.description}
              onChange={(event) => setRow(index, { description: event.target.value, product: null })}
              placeholder="Product name or code"
              maxLength={300}
              className={`${field} min-w-0 flex-1`}
            />
            <label htmlFor={`ws-quantity-${index}`} className="sr-only">
              Quantity of product {index + 1}
            </label>
            <input
              id={`ws-quantity-${index}`}
              inputMode="numeric"
              value={row.quantity}
              onChange={(event) => setRow(index, { quantity: event.target.value.replace(/\D/g, "") })}
              placeholder="Qty"
              maxLength={6}
              className={`${field} w-20 shrink-0`}
            />
            {rows.length > 1 && (
              <button
                type="button"
                aria-label={`Remove product ${index + 1}`}
                onClick={() => setRows(rows.filter((_, position) => position !== index))}
                className="h-11 w-9 shrink-0 text-[#a3221a]"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {rows.length < 30 && (
          <button type="button" onClick={() => setRows([...rows, emptyRow()])} className="h-11 self-start font-semibold text-maroon underline">
            Add another product
          </button>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ws-message" className={label}>
          Anything else?
        </label>
        <textarea
          id="ws-message"
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="When you need it, delivery, custom sizes"
          maxLength={2000}
          className={`${input} h-auto py-2.5`}
        />
      </div>

      <button type="submit" disabled={sending} className="flex h-[52px] items-center justify-center rounded-full bg-maroon font-semibold text-ivory hover:bg-maroon-deep disabled:opacity-60">
        {sending ? "Sending…" : "Ask for a quote"}
      </button>
    </form>
  );
}
