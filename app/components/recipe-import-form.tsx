"use client";

import { useRef, useState } from "react";
import { requestJson, ClientApiError } from "@/lib/editor-client";
import { recipeImportToDraft, recipeImportToReview, recipeImportUrlError, type RecipeImportReview } from "@/lib/recipe-import/frontend";
import type { RecipeImportResponse } from "@/lib/recipe-import/types";
import type { RecipeDraft } from "@/lib/recipe-vault";
import { RecipeImportReview as ImportReview } from "@/app/components/recipe-import-review";

type RecipeImportFormProps = {
  onBack: () => void;
  onImported: (draft: RecipeDraft, review: RecipeImportReview) => void;
  firstFocusRef?: React.RefObject<HTMLInputElement | null>;
};

export function RecipeImportForm({ onBack, onImported, firstFocusRef }: RecipeImportFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [response, setResponse] = useState<RecipeImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorWarnings, setErrorWarnings] = useState<RecipeImportResponse["warnings"]>([]);
  const [retryable, setRetryable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const importUrl = async () => {
    const validationError = recipeImportUrlError(url);
    if (validationError) {
      setFieldError(validationError);
      inputRef.current?.focus();
      return;
    }

    setFieldError(null);
    setError(null);
    setErrorWarnings([]);
    setResponse(null);
    setLoading(true);
    try {
      const imported = await requestJson<RecipeImportResponse>("/api/recipe-import", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      setResponse(imported);
    } catch (requestError) {
      const message = requestError instanceof ClientApiError ? requestError.message : "Importen kunde inte genomföras.";
      setError(message);
      setRetryable(requestError instanceof ClientApiError && requestError.retryable);
      setErrorWarnings(requestError instanceof ClientApiError ? requestError.warnings ?? [] : []);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void importUrl();
  };
  const review = response ? recipeImportToReview(response) : null;

  const assignInputRef = (element: HTMLInputElement | null) => { inputRef.current = element; if (firstFocusRef) firstFocusRef.current = element; };
  return <section className="recipe-import-surface"><button className="text-button import-back" type="button" onClick={onBack}>← Tillbaka till val</button><p className="eyebrow">Importera recept</p><h2 id="recipe-import-title">Hämta från en webbsida</h2><p>Klistra in adressen till ett recept. Uppgifterna hämtas och öppnas i redigeraren så att du kan kontrollera dem innan du publicerar.</p><form onSubmit={submit} noValidate><div className="import-url-field"><label htmlFor="recipe-import-url">Webbadress till receptet</label><input ref={assignInputRef} id="recipe-import-url" type="url" inputMode="url" value={url} onChange={(event) => { setUrl(event.target.value); setFieldError(null); setError(null); setResponse(null); }} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "recipe-import-url-error" : undefined} placeholder="https://exempel.se/recept" disabled={loading} />{fieldError && <p className="field-error" id="recipe-import-url-error" role="alert">{fieldError}</p>}</div><div className="dialog-actions"><button className="button" type="submit" disabled={loading}>{loading ? "Importerar…" : "Importera recept"}</button></div></form>{loading && <p className="import-status" role="status" aria-live="polite">Hämtar och tolkar receptet…</p>}{error && <div className="form-errors import-error" role="alert"><p>{error}</p>{retryable && <button className="text-button" type="button" onClick={() => void importUrl()}>Försök igen</button>}{errorWarnings.length > 0 && <ul>{errorWarnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul>}</div>}{review && response && <><ImportReview review={review} /><div className="dialog-actions import-review-actions"><button className="button" type="button" onClick={() => onImported(recipeImportToDraft(response.result), review)}>Öppna i redigeraren</button><button className="text-button" type="button" onClick={() => setResponse(null)}>Importera en annan adress</button></div></>}</section>;
}
