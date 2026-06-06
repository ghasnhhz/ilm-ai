"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";

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
      <Link
        href="/"
        className="mb-6 text-lg font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        Ilm AI
      </Link>
      <h1 className="text-2xl font-bold text-ink">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted-fg">
        {isSignup
          ? "Start learning from your own materials."
          : "Log in to continue learning."}
      </p>

      <form onSubmit={handle} className="mt-6 flex flex-col gap-3">
        {isSignup && (
          <Input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <Input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PasswordInput
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" loading={loading} className="w-full">
          {isSignup ? "Sign up" : "Log in"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-fg">
        <span className="h-px flex-1 bg-hairline" />
        or
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl: "/profile" })}
      >
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-fg">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
