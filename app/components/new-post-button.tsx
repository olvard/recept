"use client";

import { useRecipeEditor } from "@/app/components/app-shell";

export function NewPostButton() {
  const { openCreate } = useRecipeEditor();
  return <button className="new-post intro-new-post" type="button" onClick={openCreate}>+ Nytt recept</button>;
}
