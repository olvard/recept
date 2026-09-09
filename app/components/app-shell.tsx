"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

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
        <button className="new-post" type="button" onClick={() => setIsOpen(true)}>+ Ny post</button>
      </header>
      <main>{children}</main>
      <footer>Arkiverad · Filed 2026</footer>
      <nav className="mobile-nav" aria-label="Mobilnavigering">
        <Link className={vaultActive ? "active" : ""} href="/vault">Vault</Link>
        <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link>
      </nav>
      {isOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
        <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <p className="eyebrow">Kommande</p><h2 id="dialog-title">Ny post kommer i fas 2</h2>
          <p>Anteckningar och nya recept får en egen plats i nästa fas.</p>
          <button ref={closeRef} type="button" className="button" onClick={() => setIsOpen(false)}>Stäng</button>
        </section>
      </div>}
    </div>
  );
}
