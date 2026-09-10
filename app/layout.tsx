import type { Metadata } from "next";
import { Syne_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/app/components/app-shell";

const syneMono = Syne_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-syne-mono",
})

export const metadata: Metadata = {
  title: "Recept — Personligt receptarkiv",
  description: "Ett stillsamt arkiv för personliga recept.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={syneMono.variable}>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
