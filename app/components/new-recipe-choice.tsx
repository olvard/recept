"use client";

type NewRecipeChoiceProps = {
  onCreate: () => void;
  onImport: () => void;
  onBack?: () => void;
  firstFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

export function NewRecipeChoice({ onCreate, onImport, onBack, firstFocusRef }: NewRecipeChoiceProps) {
  return <section className="new-recipe-choice"><p className="eyebrow">Nytt recept</p><h2 id="new-recipe-choice-title">Hur vill du lägga till receptet?</h2><p>Skapa ett recept från grunden eller hämta uppgifterna från en webbsida och granska dem först.</p><div className="choice-actions"><button ref={firstFocusRef} className="button" type="button" onClick={onCreate}>Skapa recept</button><button className="choice-button" type="button" onClick={onImport}>Importera från webben</button></div>{onBack && <button className="text-button choice-back" type="button" onClick={onBack}>← Tillbaka</button>}</section>;
}
