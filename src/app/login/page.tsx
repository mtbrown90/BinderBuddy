"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "./actions";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="max-w-sm mx-auto mt-16 flex flex-col gap-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 font-semibold text-2xl mb-1">
          <Logo size={32} />
          BinderBuddy
        </div>
        <p className="text-muted text-sm">Log in to your collection</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4 bg-panel border border-border rounded-2xl p-5">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink"
          />
        </label>
        {state?.error && <p className="text-bad text-sm">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="text-teal font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
