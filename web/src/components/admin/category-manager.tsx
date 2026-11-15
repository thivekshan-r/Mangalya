"use client";

import { useEffect, useState } from "react";
import { refreshSite } from "@/app/admin/actions";
import { api, messageOf, type AdminCategory } from "@/lib/admin-api";
import { ConfirmButton, ErrorNote, Field, card, inputClass, primaryButton, quietButton, useClearOnLeave } from "./ui";

export function CategoryManager() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null); // from a change that failed
  const [loadProblem, setLoadProblem] = useState<string | null>(null); // from loading the list
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEn, setNewEn] = useState("");
  const [newTa, setNewTa] = useState("");

  useClearOnLeave(() => setProblem(null));

  // Changing `version` loads the list again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api<{ items: AdminCategory[] }>("/api/admin/categories")
      .then(({ items }) => {
        if (cancelled) return;
        setCategories(items);
        setLoadProblem(null);
      })
      .catch((error) => {
        if (!cancelled) setLoadProblem(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  /** Runs one change, then reloads the list and refreshes the customer site. */
  async function change(action: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await action();
      await refreshSite();
      return true;
    } catch (error) {
      setProblem(messageOf(error));
      return false;
    } finally {
      setBusy(false);
      setVersion((current) => current + 1);
    }
  }

  /** Moves a category up or down the menu by renumbering the whole list. */
  function move(index: number, by: -1 | 1) {
    if (!categories) return;
    const reordered = [...categories];
    const moved = reordered[index];
    const other = reordered[index + by];
    if (!moved || !other) return;
    reordered[index] = other;
    reordered[index + by] = moved;

    void change(() =>
      Promise.all(
        reordered.map((category, position) =>
          category.order === position + 1
            ? null
            : api(`/api/admin/categories/${category.id}`, { method: "PATCH", body: { order: position + 1 } }),
        ),
      ),
    );
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!newEn.trim()) return;

    const added = await change(() =>
      api("/api/admin/categories", {
        body: { name: { en: newEn.trim(), ta: newTa.trim() }, order: (categories?.length ?? 0) + 1 },
      }),
    );
    if (added) {
      setNewEn("");
      setNewTa("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl font-semibold text-maroon">Categories</h1>
      <p className="text-sm text-ink-soft">The order here is the order in the website menu.</p>

      <ErrorNote message={loadProblem} />
      <ErrorNote message={problem} />

      {!categories ? (
        !loadProblem && <p className="text-ink-muted">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((category, index) => (
            <li key={category.id} className={`${card} p-3`}>
              {editingId === category.id ? (
                <RenameForm
                  category={category}
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSave={async (name) => {
                    const saved = await change(() => api(`/api/admin/categories/${category.id}`, { method: "PATCH", body: { name } }));
                    if (saved) setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{category.name.en}</p>
                      <p lang="ta" className="text-sm text-ink-muted">
                        {category.name.ta || "No Tamil name yet"}
                      </p>
                    </div>
                    {!category.visible && <span className="rounded-md bg-sand px-2 py-0.5 text-xs font-semibold">Hidden</span>}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                    <button type="button" aria-label={`Move ${category.name.en} up`} disabled={busy || index === 0} onClick={() => move(index, -1)} className={quietButton}>
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${category.name.en} down`}
                      disabled={busy || index === categories.length - 1}
                      onClick={() => move(index, 1)}
                      className={quietButton}
                    >
                      ↓
                    </button>
                    <button type="button" disabled={busy} onClick={() => setEditingId(category.id)} className={quietButton}>
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => change(() => api(`/api/admin/categories/${category.id}`, { method: "PATCH", body: { visible: !category.visible } }))}
                      className={quietButton}
                    >
                      {category.visible ? "Hide" : "Show on site"}
                    </button>
                    <ConfirmButton
                      label="Delete"
                      confirmLabel="Yes, delete"
                      disabled={busy}
                      onConfirm={() => void change(() => api(`/api/admin/categories/${category.id}`, { method: "DELETE" }))}
                    />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className={`${card} flex flex-col gap-3 p-3`}>
        <h2 className="font-semibold">Add a category</h2>
        <Field label="Name (English)" htmlFor="new-category-en">
          <input id="new-category-en" value={newEn} onChange={(event) => setNewEn(event.target.value)} maxLength={200} className={inputClass} />
        </Field>
        <Field label="Name (Tamil)" htmlFor="new-category-ta">
          <input id="new-category-ta" lang="ta" value={newTa} onChange={(event) => setNewTa(event.target.value)} maxLength={200} className={inputClass} />
        </Field>
        <button type="submit" disabled={busy || !newEn.trim()} className={primaryButton}>
          Add category
        </button>
      </form>
    </div>
  );
}

function RenameForm({
  category,
  busy,
  onSave,
  onCancel,
}: {
  category: AdminCategory;
  busy: boolean;
  onSave: (name: { en: string; ta: string }) => void;
  onCancel: () => void;
}) {
  const [en, setEn] = useState(category.name.en);
  const [ta, setTa] = useState(category.name.ta);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (en.trim()) onSave({ en: en.trim(), ta: ta.trim() });
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Name (English)" htmlFor={`rename-en-${category.id}`}>
        <input id={`rename-en-${category.id}`} value={en} onChange={(event) => setEn(event.target.value)} maxLength={200} className={inputClass} />
      </Field>
      <Field label="Name (Tamil)" htmlFor={`rename-ta-${category.id}`}>
        <input id={`rename-ta-${category.id}`} lang="ta" value={ta} onChange={(event) => setTa(event.target.value)} maxLength={200} className={inputClass} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !en.trim()} className={primaryButton}>
          Save
        </button>
        <button type="button" onClick={onCancel} className={quietButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}
