import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/app/components/app-shell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Recept — Personliga recept",
  description: "En samling personliga recept.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${inter.variable} ${lora.variable}`}>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
