import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/app/components/app-shell";

export const metadata: Metadata = {
  title: "Recept — Personligt receptarkiv",
  description: "Ett stillsamt arkiv för personliga recept.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
