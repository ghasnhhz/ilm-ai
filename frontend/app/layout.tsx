import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Ilm AI — Your personal learning companion",
  description:
    "Bring your own materials. Ilm AI quizzes you, explains your mistakes, finds your gaps, and builds a learning plan that fits your life.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale — pinch-zoom must stay enabled for mobile accessibility.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // lang starts at "en" (keeps this layout static); LangProvider restores the
  // saved locale and updates document.documentElement.lang after hydration.
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
