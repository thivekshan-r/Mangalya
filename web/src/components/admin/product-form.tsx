"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { refreshSite } from "@/app/admin/actions";
import { api, messageOf, uploadPhoto, type AdminCategory, type AdminProduct } from "@/lib/admin-api";
import { ConfirmButton, ErrorNote, Field, Toggle, card, inputClass, primaryButton, quietButton, useClearOnLeave } from "./ui";

/** What the form holds while it is being edited. Lists are kept as text the shop can type. */
type Draft = {
  nameEn: string;
  nameTa: string;
  descriptionEn: string;
  descriptionTa: string;
  category: string;
  price: string;
  code: string;
  tags: string;
  options: { name: string; values: string }[];
  images: { url: string; publicId: string; alt: string }[];
  inStock: boolean;
  featured: boolean;
  visible: boolean;
};

const EMPTY: Draft = {
  nameEn: "",
  nameTa: "",
  descriptionEn: "",
  descriptionTa: "",
  category: "",
  price: "",
  code: "",
  tags: "",
  options: [],
  images: [],
  inStock: true,
  featured: false,
  visible: true,
};

function toDraft(product: AdminProduct): Draft {
  return {
    nameEn: product.name.en,
    nameTa: product.name.ta,
    descriptionEn: product.description.en,
    descriptionTa: product.description.ta,
    category: product.category?.id ?? "",
    price: product.price === null ? "" : String(product.price),
    code: product.code,
    tags: product.tags.join(", "),
    options: product.options.map((option) => ({ name: option.name, values: option.values.join(", ") })),
    images: product.images,
    inStock: product.inStock,
    featured: product.featured,
    visible: product.visible,
  };
}

/** "8 × 10, 10 × 12" -> ["8 × 10", "10 × 12"] */
const splitList = (text: string) =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Turns the form into what the API expects. Throws a readable message if something is missing. */
function toBody(draft: Draft, isNew: boolean) {
  if (!draft.nameEn.trim()) throw new Error("Enter the product name in English.");
  if (!draft.category) throw new Error("Choose a category.");

  const priceText = draft.price.replace(/[,\s]/g, "");
  const price = priceText === "" ? null : Number(priceText);
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    throw new Error("The price must be a number, for example 2500. Leave it empty for “Ask for price”.");
  }

  const options = draft.options
    .map((option) => ({ name: option.name.trim(), values: splitList(option.values) }))
    .filter((option) => option.name || option.values.length > 0);
  if (options.some((option) => !option.name || option.values.length === 0)) {
    throw new Error("Each option needs a name (such as Size) and at least one choice.");
  }

  const code = draft.code.trim();

  return {
    name: { en: draft.nameEn.trim(), ta: draft.nameTa.trim() },
    description: { en: draft.descriptionEn.trim(), ta: draft.descriptionTa.trim() },
    category: draft.category,
    price,
    tags: splitList(draft.tags),
    options,
    images: draft.images,
    inStock: draft.inStock,
    featured: draft.featured,
    visible: draft.visible,
    // A new product with no code gets one made for it (MG-12345).
    ...(code || !isNew ? { code } : {}),
  };
}

/** Add a product (no id) or edit one (with id). */
export function ProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const isNew = id === undefined;

  const [draft, setDraft] = useState<Draft | null>(isNew ? EMPTY : null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);

  useClearOnLeave(() => setProblem(null));

  // Runs when the form opens, and again each time it is shown, so an edit form always starts from what is saved.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api<{ items: AdminCategory[] }>("/api/admin/categories"),
      id ? api<{ product: AdminProduct }>(`/api/admin/products/${id}`) : null,
    ])
      .then(([categoryList, detail]) => {
        if (cancelled) return;
        setCategories(categoryList.items);
        if (detail) setDraft(toDraft(detail.product));
      })
      .catch((error) => {
        if (!cancelled) setProblem(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!draft) {
    return problem ? <ErrorNote message={problem} /> : <p className="text-ink-muted">Loading…</p>;
  }

  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft({ ...draft, [key]: value });

  /** Goes back to the product list, leaving the form clean for next time. */
  function leave() {
    if (isNew) setDraft(EMPTY);
    setSaving(false);
    router.push("/admin");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;

    let body;
    try {
      body = toBody(draft, isNew);
    } catch (error) {
      setProblem((error as Error).message);
      window.scrollTo({ top: 0 });
      return;
    }

    setSaving(true);
    setProblem(null);
    try {
      await api(isNew ? "/api/admin/products" : `/api/admin/products/${id}`, { method: isNew ? "POST" : "PATCH", body });
      await refreshSite();
      leave();
    } catch (error) {
      setProblem(messageOf(error));
      setSaving(false);
      window.scrollTo({ top: 0 });
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api(`/api/admin/products/${id}`, { method: "DELETE" });
      await refreshSite();
      leave();
    } catch (error) {
      setProblem(messageOf(error));
      setSaving(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProblem(null);

    for (const file of Array.from(files)) {
      setUploading((count) => count + 1);
      try {
        const image = await uploadPhoto(file);
        setDraft((current) => current && { ...current, images: [...current.images, { ...image, alt: "" }] });
      } catch (error) {
        setProblem(`${file.name}: ${messageOf(error)}`);
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  function movePhoto(index: number, by: -1 | 1) {
    if (!draft) return;
    const images = [...draft.images];
    const target = index + by;
    const moved = images[index];
    const other = images[target];
    if (!moved || !other) return;
    images[index] = other;
    images[target] = moved;
    set("images", images);
  }

  const setOption = (index: number, change: Partial<Draft["options"][number]>) =>
    set(
      "options",
      draft.options.map((option, position) => (position === index ? { ...option, ...change } : option)),
    );

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-maroon">{isNew ? "Add product" : "Edit product"}</h1>
        <button type="button" onClick={leave} className="h-11 underline">
          Cancel
        </button>
      </div>

      <ErrorNote message={problem} />

      <section>
        <h2 className="font-semibold">Photos</h2>
        <p className="mb-2.5 text-[13px] text-ink-muted">The first photo is the cover. Use the arrows to change the order.</p>

        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {draft.images.map((image, index) => (
            <li key={image.url} className={`${card} overflow-hidden ${index === 0 ? "border-2 border-maroon" : ""}`}>
              <div className="relative aspect-square bg-sand">
                <Image src={image.url} alt={`Photo ${index + 1}`} fill sizes="160px" className="object-cover" />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-maroon px-1.5 py-0.5 text-[11px] font-semibold text-ivory">Cover</span>
                )}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  aria-label={`Move photo ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => movePhoto(index, -1)}
                  className="h-11 flex-1 disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => set("images", draft.images.filter((_, position) => position !== index))}
                  className="h-11 flex-1 text-[#a3221a]"
                >
                  ✕
                </button>
                <button
                  type="button"
                  aria-label={`Move photo ${index + 1} later`}
                  disabled={index === draft.images.length - 1}
                  onClick={() => movePhoto(index, 1)}
                  className="h-11 flex-1 disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </li>
          ))}

          {draft.images.length < 12 && (
            <li>
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-muted bg-white text-sm text-maroon">
                <span className="text-2xl leading-none">+</span>
                {uploading > 0 ? "Uploading…" : "Add photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void addPhotos(event.target.files);
                    event.target.value = ""; // so the same file can be chosen again
                  }}
                />
              </label>
            </li>
          )}
        </ul>
      </section>

      <Field label="Name (English)" htmlFor="name-en">
        <input id="name-en" value={draft.nameEn} onChange={(event) => set("nameEn", event.target.value)} maxLength={200} className={inputClass} />
      </Field>

      <Field label="Name (Tamil)" htmlFor="name-ta" hint="If Tamil is left empty, the site shows the English text.">
        <input id="name-ta" lang="ta" value={draft.nameTa} onChange={(event) => set("nameTa", event.target.value)} maxLength={200} className={inputClass} />
      </Field>

      <Field label="Description (English)" htmlFor="description-en">
        <textarea
          id="description-en"
          rows={4}
          value={draft.descriptionEn}
          onChange={(event) => set("descriptionEn", event.target.value)}
          placeholder="Material, glass, what is included"
          className={`${inputClass} h-auto py-2.5`}
        />
      </Field>

      <Field label="Description (Tamil)" htmlFor="description-ta">
        <textarea
          id="description-ta"
          lang="ta"
          rows={4}
          value={draft.descriptionTa}
          onChange={(event) => set("descriptionTa", event.target.value)}
          className={`${inputClass} h-auto py-2.5`}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category">
          <select id="category" value={draft.category} onChange={(event) => set("category", event.target.value)} className={inputClass}>
            <option value="">Choose…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name.en}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Price (Rs.)" htmlFor="price" hint="Leave empty to show “Ask for price”.">
          <input id="price" inputMode="numeric" value={draft.price} onChange={(event) => set("price", event.target.value)} placeholder="2500" className={inputClass} />
        </Field>
      </div>

      <section>
        <h2 className="font-semibold">Options</h2>
        <p className="mb-2.5 text-[13px] text-ink-muted">Choices the customer picks, such as size or colour. Separate the choices with commas.</p>

        <div className="flex flex-col gap-3">
          {draft.options.map((option, index) => (
            <div key={index} className={`${card} flex flex-col gap-2 p-3`}>
              <label htmlFor={`option-name-${index}`} className="text-sm font-semibold">
                Option {index + 1} name
              </label>
              <input
                id={`option-name-${index}`}
                value={option.name}
                onChange={(event) => setOption(index, { name: event.target.value })}
                placeholder="Size (inches)"
                className={inputClass}
              />
              <label htmlFor={`option-values-${index}`} className="text-sm font-semibold">
                Choices
              </label>
              <input
                id={`option-values-${index}`}
                value={option.values}
                onChange={(event) => setOption(index, { values: event.target.value })}
                placeholder="8 × 10, 10 × 12, 12 × 18"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => set("options", draft.options.filter((_, position) => position !== index))}
                className="h-11 self-start font-semibold text-[#a3221a]"
              >
                Remove this option
              </button>
            </div>
          ))}

          {draft.options.length < 10 && (
            <button type="button" onClick={() => set("options", [...draft.options, { name: "", values: "" }])} className={`${quietButton} self-start`}>
              Add an option
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product code" htmlFor="code" hint={isNew ? "Leave empty and one is made for you." : "Shown in WhatsApp orders."}>
          <input id="code" value={draft.code} onChange={(event) => set("code", event.target.value.toUpperCase())} maxLength={20} className={inputClass} />
        </Field>

        <Field label="Tags" htmlFor="tags" hint="Words that help search, separated by commas.">
          <input id="tags" value={draft.tags} onChange={(event) => set("tags", event.target.value)} placeholder="wedding, gold" className={inputClass} />
        </Field>
      </div>

      <div className={card}>
        <Toggle id="in-stock" label="In stock" checked={draft.inStock} onChange={(checked) => set("inStock", checked)} />
        <Toggle id="featured" label="Featured on the home page" checked={draft.featured} onChange={(checked) => set("featured", checked)} />
        <Toggle id="visible" label="Visible on the website" checked={draft.visible} onChange={(checked) => set("visible", checked)} />
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" disabled={saving || uploading > 0} className={primaryButton}>
          {saving ? "Saving…" : uploading > 0 ? "Waiting for photos…" : "Save product"}
        </button>
        {!isNew && (
          <div className="flex justify-center">
            <ConfirmButton label="Delete product" confirmLabel="Yes, delete" disabled={saving} onConfirm={remove} />
          </div>
        )}
      </div>
    </form>
  );
}
