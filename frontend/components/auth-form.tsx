"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

type Props = {
  mode: "login" | "signup";
  onSubmit: (data: {
    email: string;
    password: string;
    name: string;
  }) => Promise<string | null>;
};

export function AuthForm({ mode, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await onSubmit({ email, password, name });
    if (err) setError(err);
    setLoading(false);
  }

  const isSignup = mode === "signup";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {isSignup
          ? "Start learning from your own materials."
          : "Log in to continue learning."}
      </p>

      <form onSubmit={handle} className="mt-6 flex flex-col gap-3">
        {isSignup && (
          <input
            className="rounded-lg border border-slate-300 px-3 py-2.5"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className="rounded-lg border border-slate-300 px-3 py-2.5"
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2.5"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-fg disabled:opacity-60"
        >
          {loading ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/profile" })}
        className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium hover:bg-slate-50"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-slate-600">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <a href="/login" className="font-medium text-brand">
              Log in
            </a>
          </>
        ) : (
          <>
            New here?{" "}
            <a href="/signup" className="font-medium text-brand">
              Sign up
            </a>
          </>
        )}
      </p>
    </div>
  );
}
