import type { Metadata } from "next";
import type { ReactNode } from "react";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = {
  title: `${tr.app.name} — ${tr.app.tagline}`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
