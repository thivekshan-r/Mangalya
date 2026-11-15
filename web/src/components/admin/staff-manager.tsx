"use client";

import { useEffect, useState } from "react";
import { api, messageOf, type Account } from "@/lib/admin-api";
import { ConfirmButton, ErrorNote, Field, card, inputClass, primaryButton, quietButton, useClearOnLeave } from "./ui";
import { useUser } from "./session";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never";

/** The owner's screen for giving shop staff their own logins. */
export function StaffManager() {
  const user = useUser();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null); // from a change that failed
  const [loadProblem, setLoadProblem] = useState<string | null>(null); // from loading the list
  const [busy, setBusy] = useState(false);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useClearOnLeave(() => {
    setProblem(null);
    setPassword("");
    setPasswordFor(null);
  });

  // Changing `version` loads the list again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (user.role !== "owner") return;
    let cancelled = false;

    api<{ items: Account[] }>("/api/admin/users")
      .then(({ items }) => {
        if (cancelled) return;
        setAccounts(items);
        setLoadProblem(null);
      })
      .catch((error) => {
        if (!cancelled) setLoadProblem(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [user.role, version]);

  async function change(action: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await action();
      return true;
    } catch (error) {
      setProblem(messageOf(error));
      return false;
    } finally {
      setBusy(false);
      setVersion((current) => current + 1);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();

    const added = await change(() => api("/api/admin/users", { body: { name: name.trim(), email: email.trim(), password } }));
    if (added) {
      setName("");
      setEmail("");
      setPassword("");
    }
  }

  if (user.role !== "owner") {
    return <p className="text-ink-soft">Only the owner can manage staff accounts.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl font-semibold text-maroon">Staff</h1>
      <p className="text-sm text-ink-soft">
        Staff can manage products, categories and enquiries. They cannot change shop settings or other accounts.
      </p>

      <ErrorNote message={loadProblem} />
      <ErrorNote message={problem} />

      {!accounts ? (
        !loadProblem && <p className="text-ink-muted">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id} className={`${card} p-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {account.name}
                    {account.id === user.id && " (you)"}
                  </p>
                  <p className="break-all text-sm text-ink-muted">{account.email}</p>
                  <p className="text-[13px] text-ink-muted">Last login: {formatDate(account.lastLogin)}</p>
                </div>
                <span className="shrink-0 rounded-md bg-sand px-2 py-0.5 text-xs font-semibold capitalize">
                  {account.active ? account.role : "Switched off"}
                </span>
              </div>

              {account.role === "staff" &&
                (passwordFor === account.id ? (
                  <NewPasswordForm
                    busy={busy}
                    onCancel={() => setPasswordFor(null)}
                    onSave={async (value) => {
                      const saved = await change(() => api(`/api/admin/users/${account.id}`, { method: "PATCH", body: { password: value } }));
                      if (saved) setPasswordFor(null);
                    }}
                  />
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => change(() => api(`/api/admin/users/${account.id}`, { method: "PATCH", body: { active: !account.active } }))}
                      className={quietButton}
                    >
                      {account.active ? "Switch off" : "Switch on"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setPasswordFor(account.id)} className={quietButton}>
                      New password
                    </button>
                    <ConfirmButton
                      label="Remove"
                      confirmLabel="Yes, remove"
                      disabled={busy}
                      onConfirm={() => void change(() => api(`/api/admin/users/${account.id}`, { method: "DELETE" }))}
                    />
                  </div>
                ))}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className={`${card} flex flex-col gap-3 p-3`}>
        <h2 className="font-semibold">Add a staff account</h2>
        <Field label="Name" htmlFor="staff-name">
          <input id="staff-name" required value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="staff-email">
          <input id="staff-email" required type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Password" htmlFor="staff-password" hint="At least 10 characters. Give it to them in person; they can change it under My account.">
          <input
            id="staff-password"
            required
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={busy} className={primaryButton}>
          Add staff account
        </button>
      </form>
    </div>
  );
}

function NewPasswordForm({ busy, onSave, onCancel }: { busy: boolean; onSave: (password: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
      className="mt-2 flex flex-col gap-3 border-t border-line pt-3"
    >
      <Field label="New password" htmlFor="staff-new-password" hint="At least 10 characters.">
        <input
          id="staff-new-password"
          required
          type="password"
          autoComplete="new-password"
          minLength={10}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>
          Save password
        </button>
        <button type="button" onClick={onCancel} className={quietButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}
