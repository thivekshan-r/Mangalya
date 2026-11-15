"use client";

import { useEffect, useState } from "react";
import { refreshSite } from "@/app/admin/actions";
import { api, messageOf, type Settings } from "@/lib/admin-api";
import { ErrorNote, Field, SavedNote, inputClass, primaryButton, useClearOnLeave } from "./ui";
import { useUser } from "./session";

export function SettingsForm() {
  const user = useUser();
  const isOwner = user.role === "owner";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useClearOnLeave(() => {
    setSaved(null);
    setProblem(null);
  });

  useEffect(() => {
    let cancelled = false;

    api<{ settings: Settings }>("/api/settings")
      .then(({ settings }) => {
        if (!cancelled) setSettings(settings);
      })
      .catch((error) => {
        if (!cancelled) setProblem(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) {
    return problem ? <ErrorNote message={problem} /> : <p className="text-ink-muted">Loading…</p>;
  }

  const set = (change: Partial<Settings>) => {
    setSettings({ ...settings, ...change });
    setSaved(null);
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setProblem(null);
    setSaved(null);
    try {
      const answer = await api<{ settings: Settings }>("/api/admin/settings", {
        method: "PUT",
        body: {
          // Spaces, "+" and dashes are removed, so 94 77 123 4567 and +94771234567 both work.
          whatsappNumber: settings.whatsappNumber.replace(/\D/g, ""),
          instagramUrl: settings.instagramUrl.trim(),
          address: settings.address,
          openingHours: settings.openingHours,
        },
      });
      setSettings(answer.settings);
      await refreshSite();
      setSaved("Saved. The website now shows these details.");
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  const area = `${inputClass} h-auto py-2.5`;

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <h1 className="font-serif text-2xl font-semibold text-maroon">Shop settings</h1>

      {!isOwner && <p className="text-sm text-ink-soft">Only the owner can change these details.</p>}

      <ErrorNote message={problem} />
      <SavedNote message={saved} />

      <fieldset disabled={!isOwner || saving} className="flex flex-col gap-5">
        <Field
          label="WhatsApp number"
          htmlFor="whatsapp"
          hint="With the country code, for example 94771234567. Orders from the website open a chat with this number."
        >
          <input
            id="whatsapp"
            inputMode="tel"
            value={settings.whatsappNumber}
            onChange={(event) => set({ whatsappNumber: event.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Instagram page" htmlFor="instagram">
          <input
            id="instagram"
            type="url"
            value={settings.instagramUrl}
            onChange={(event) => set({ instagramUrl: event.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Shop address (English)" htmlFor="address-en">
          <textarea
            id="address-en"
            rows={3}
            value={settings.address.en}
            onChange={(event) => set({ address: { ...settings.address, en: event.target.value } })}
            className={area}
          />
        </Field>

        <Field label="Shop address (Tamil)" htmlFor="address-ta">
          <textarea
            id="address-ta"
            lang="ta"
            rows={3}
            value={settings.address.ta}
            onChange={(event) => set({ address: { ...settings.address, ta: event.target.value } })}
            className={area}
          />
        </Field>

        <Field label="Opening hours (English)" htmlFor="hours-en" hint="One line per day or group of days.">
          <textarea
            id="hours-en"
            rows={3}
            value={settings.openingHours.en}
            onChange={(event) => set({ openingHours: { ...settings.openingHours, en: event.target.value } })}
            placeholder={"Monday to Saturday: 9am to 7pm\nSunday: closed"}
            className={area}
          />
        </Field>

        <Field label="Opening hours (Tamil)" htmlFor="hours-ta">
          <textarea
            id="hours-ta"
            lang="ta"
            rows={3}
            value={settings.openingHours.ta}
            onChange={(event) => set({ openingHours: { ...settings.openingHours, ta: event.target.value } })}
            className={area}
          />
        </Field>

        {isOwner && (
          <button type="submit" className={primaryButton}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        )}
      </fieldset>
    </form>
  );
}
