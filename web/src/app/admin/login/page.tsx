"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { ErrorNote, Field, inputClass, primaryButton } from "@/components/admin/ui";
import { api, messageOf } from "@/lib/admin-api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function logIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);

    try {
      await api("/api/auth/login", { body: { email, password } });
      // Clear the form before leaving: this page's state is kept while it is hidden.
      setPassword("");
      setBusy(false);
      router.replace("/admin");
    } catch (error) {
      setProblem(messageOf(error));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center rounded-2xl bg-maroon py-3">
        <Image src={logo} alt="Mangalya" priority className="h-[88px] w-[180px] object-cover mix-blend-lighten" />
      </div>

      <h1 className="mb-4 text-center font-serif text-2xl font-semibold text-maroon">Admin login</h1>

      <form onSubmit={logIn} className="flex flex-col gap-4">
        <ErrorNote message={problem} />

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
