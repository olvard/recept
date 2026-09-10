"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const vaultActive = pathname === "/vault" || pathname.startsWith("/recipes");
  return (
    <div className="site-frame">
      <header className="site-header">
        <Link className="wordmark" href="/vault">Recept</Link>
        <nav className="desktop-nav" aria-label="Huvudnavigering">
          <Link className={vaultActive ? "active" : ""} href="/vault">Recept</Link>
          <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link>
        </nav>
        <div className="attribution"><span>Oliver</span><span>V.1</span><span>8 arkiverade recept</span></div>
      </header>
      <main>{children}</main>
      <footer>Oliver Lundin · Created 2026</footer>
      <nav className="mobile-nav" aria-label="Mobilnavigering">
        <Link className={vaultActive ? "active" : ""} href="/vault">Recept</Link>
        <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link>
      </nav>
    </div>
  );
}
