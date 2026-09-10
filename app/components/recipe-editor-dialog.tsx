"use client";

import { useEffect, useRef } from "react";
import type { MergedRecipe } from "@/lib/recipe-vault";
import { RecipeEditorForm } from "@/app/components/recipe-editor-form";

export function RecipeEditorDialog({ mode, recipe, onClose, onSaved }: { mode: "create" | "edit"; recipe?: MergedRecipe; onClose: () => void; onSaved: (recipe: MergedRecipe) => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown); return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><RecipeEditorForm mode={mode} recipe={recipe} onClose={onClose} onSaved={onSaved} containerRef={dialogRef} className="dialog editor-dialog" dialog /></div>;
}
