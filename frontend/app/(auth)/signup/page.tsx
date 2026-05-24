"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { AuthForm } from "@/components/auth-form";
import { ApiError, apiFetch } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();

  return (
    <AuthForm
      mode="signup"
      onSubmit={async ({ email, password, name }) => {
        try {
          await apiFetch("/auth/register", {
            method: "POST",
            body: { email, password, name: name || null },
          });
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            return "That email is already registered";
          }
          return "Could not create your account. Please try again.";
        }
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (!res || res.error) return "Account created — please log in.";
        router.push("/profile");
        router.refresh();
        return null;
      }}
    />
  );
}
