"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthForm
      mode="login"
      onSubmit={async ({ email, password }) => {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (!res || res.error) return "Invalid email or password";
        router.push("/profile");
        router.refresh();
        return null;
      }}
    />
  );
}
