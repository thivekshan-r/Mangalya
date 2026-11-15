"use client";

import { useState } from "react";
import { api, messageOf } from "@/lib/admin-api";
import { ErrorNote, Field, SavedNote, card, inputClass, primaryButton, useClearOnLeave } from "./ui";
import { useUser } from "./session";

/** Lets whoever is logged in change their own password. */
export function AccountForm() {
  const user = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clearFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setRepeat("");
  };

  useClearOnLeave(() => {
    clearFields();
    setProblem(null);
    setSaved(null);
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaved(null);

    if (newPassword !== repeat) {
      setProblem("The two new passwords are not the same.");
      return;
    }

    setSaving(true);
    setProblem(null);
    try {
      await api("/api/auth/password", { body: { currentPassword, newPassword } });
      clearFields();
      setSaved("Password changed. Use the new one next time you log in.");
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl font-semibold text-maroon">My account</h1>

      <div className={`${card} p-3`}>
        <p className="font-semibold">{user.name}</p>
        <p className="break-all text-sm text-ink-muted">{user.email}</p>
        <p className="text-sm capitalize text-ink-muted">{user.role}</p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-4">
        <h2 className="font-semibold">Change password</h2>

        <ErrorNote message={problem} />
        <SavedNote message={saved} />

        <Field label="Current password" htmlFor="current-password">
          <input
            id="current-password"
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="New password" htmlFor="new-password" hint="At least 10 characters. Avoid the shop name, years and phone numbers.">
          <input
            id="new-password"
            required
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="New password again" htmlFor="repeat-password">
          <input
            id="repeat-password"
            required
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            className={inputClass}
          />
        </Field>

        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
