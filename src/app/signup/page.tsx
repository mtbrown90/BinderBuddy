"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <div className="max-w-sm mx-auto mt-16 flex flex-col gap-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <Logo size={96} />
        </div>
        <p className="text-muted text-sm">Create your account</p>
      </div>

      {state?.success ? (
        <div className="bg-panel border border-border rounded-2xl p-5 text-center text-sm">
          Check your email to confirm your account, then{" "}
          <Link href="/login" className="text-teal font-medium">
            log in
          </Link>
          .
        </div>
      ) : (
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
              minLength={6}
              className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink"
            />
          </label>
          {state?.error && <p className="text-bad text-sm">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-teal font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
