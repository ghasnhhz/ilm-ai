import { AppShell } from "@/components/app-shell";

// Wraps every signed-in surface with the shared AppShell (header + mobile bottom
// nav + page container). Route groups are URL-transparent, so /library, /chat,
// etc. keep their paths and the middleware matcher is unaffected.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
