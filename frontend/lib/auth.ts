import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// Server-side base URL for backend calls made inside NextAuth callbacks.
// In Docker this is the internal service name; locally it falls back to the
// public URL.
const API =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        if (!res.ok) return null;
        const tokens = await res.json();
        const meRes = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (!meRes.ok) return null;
        const me = await meRes.json();
        return {
          id: me.id,
          email: me.email,
          name: me.name,
          backendAccessToken: tokens.access_token,
          backendRefreshToken: tokens.refresh_token,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Credentials sign-in: backend tokens come back from authorize().
      if (user && "backendAccessToken" in user) {
        token.accessToken = (user as { backendAccessToken?: string }).backendAccessToken;
        token.refreshToken = (user as { backendRefreshToken?: string }).backendRefreshToken;
        token.userId = (user as { id?: string }).id;
      }
      // Google sign-in: exchange the verified identity for backend tokens.
      if (account?.provider === "google" && token.email) {
        const res = await fetch(`${API}/auth/oauth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Bridge-Secret": process.env.AUTH_BRIDGE_SECRET ?? "",
          },
          body: JSON.stringify({
            email: token.email,
            name: token.name,
            provider: "google",
          }),
        });
        if (res.ok) {
          const tokens = await res.json();
          token.accessToken = tokens.access_token;
          token.refreshToken = tokens.refresh_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user) session.user.id = token.userId;
      return session;
    },
  },
};
