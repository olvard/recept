"use client";

import { useEffect, useRef, useState } from "react";

export function NewPostButton() {
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

  return <>
    <button className="new-post intro-new-post" type="button" onClick={() => setIsOpen(true)}> + Nytt recept</button>
    {isOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <p className="eyebrow">Kommande</p><h2 id="dialog-title">Ny post kommer i fas 2</h2>
        <p>Anteckningar och nya recept får en egen plats i nästa fas.</p>
        <button ref={closeRef} type="button" className="button" onClick={() => setIsOpen(false)}>Stäng</button>
      </section>
    </div>}
  </>;
}
