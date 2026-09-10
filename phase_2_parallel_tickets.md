# Recept — fas 2: parallella implementationstickets

Detta är en implementation backlog för [fas 2-PRD:n](./PRDs/phase_2_recipe_vault_prd.md). Varje ticket har en avgränsad skrivyta så att flera personer eller agenter kan arbeta parallellt utan filkonflikter.

## Gemensamt kontrakt

Alla tickets ska följa dessa beslut:

- Data är lokal per webbläsare via `localStorage`; ingen backend, inloggning eller extern hämtning.
- Fixture-data i `data/recipes.json` är oföränderlig basdata. Lokala redigeringar och borttagningar läggs ovanpå den.
- Recept kan ha flera av de befintliga kategorierna: `lunch`, `middag`, `matlador`.
- Nya recept får automatiskt arkivnummer och arkivdatum först vid publicering.
- Lokala detaljvyer öppnas på `/vault?recipe=<id>`. Befintliga `/recipes/[id]`-routes ska fungera oförändrat.
- All synlig UI-copy är på svenska och den befintliga visuella designen behålls.
- Inga tredjeparters UI-bibliotek.

## Beroende- och mergeordning

| Spår | Tickets som kan starta parallellt | Förutsättning för integration |
| --- | --- | --- |
| Grund | P2-01, P2-02 | P2-02 använder API:t från P2-01 |
| Funktion | P2-03, P2-04, P2-05, P2-06 | P2-01 och P2-02 måste vara mergerade eller tillgängliga som kontrakt |
| Slutkontroll | P2-07 | Alla funktions-tickets mergerade |

Rekommenderad mergeordning: P2-01 → P2-02 → P2-03/P2-04/P2-05/P2-06 → P2-07.

---

## P2-01 — Lokal receptdomän och `localStorage`-repository

**Prioritet:** hög  
**Kan påbörjas direkt:** ja  
**Ägda filer:** `lib/recipe-vault.ts`, `lib/recipes.ts`  
**Rör inte:** `app/**`, `data/recipes.json`, `app/globals.css`

### Direkt instruktion

1. Skapa `lib/recipe-vault.ts` som den enda platsen för fas 2:s datatyper, migrering och läsning/skrivning av browser-lagring.
2. Definiera en canonical recepttyp för katalog och detaljvy. Den ska minst innehålla `id`, `title`, `categorySlugs`, `prepMinutes`, `archivedAt`, `note`, `context`, `ingredients` och `instructions`. Behåll tillräcklig härledd information för att befintliga kort kan visa kategorinamn.
3. Definiera typer för utkast, publicerade lokala recept, fixture-överlagringar och borttagna fixture-ID:n. Utkast får vara ofullständiga; publicerade recept får inte vara det.
4. Implementera säkra, rena funktioner för att:
   - konvertera fixture-recept från `lib/recipes.ts` till canonical typ,
   - läsa och validera lokalt sparad state,
   - återgå till tom lokal state vid saknad eller korrupt JSON,
   - slå ihop fixtures, lokala tillägg och redigeringar,
   - markera ett fixture-recept som lokalt borttaget,
   - skapa nästa unika arkiv-ID från både fixtures och lokal state,
   - publicera ett validerat utkast med dagens lokala datum,
   - spara och rensa utkast.
5. Använd versionsnycklarna `recept.phase2.recipes.v1`, `recept.phase2.drafts.v1` och `recept.phase2.deleted.v1`.
6. Skydda varje `localStorage`-anrop för miljöer utan `window`, kvotfel och JSON-fel. Import av modulen får aldrig läsa lagring vid modulinitiering.
7. Utöka endast `lib/recipes.ts` med nödvändiga exports för fixture-konverteringen. Ändra inte fixture-innehållet eller befintliga route-kontrakt.

### Klart när

- Samma input-state alltid ger samma sammanslagna receptlista.
- Korrupt eller borttagen lagring kraschar inte appen och återgår säkert till fixtures.
- Publicering ger unikt nummer, arkivdatum och minst en kategori.
- En lokal redigering eller borttagning av ett fixture-recept påverkar inte `data/recipes.json`.
- Modulen har inga React-beroenden.

---

## P2-02 — Reaktiv klientprovider för receptarkivet

**Prioritet:** hög  
**Kan påbörjas direkt:** ja, mot P2-01:s kontrakt  
**Ägda filer:** `app/components/recipe-vault-provider.tsx`, `app/layout.tsx`  
**Rör inte:** `lib/**`, övriga komponenter, `app/globals.css`

### Direkt instruktion

1. Skapa en Client Component-provider i `app/components/recipe-vault-provider.tsx`.
2. Providern ska läsa den sammanslagna listan först efter mount och exponera ett typat hook-API, exempelvis `useRecipeVault()`.
3. Hook-API:t ska exponera loading-state, sammanslagna recept, utkast samt mutationer för att spara utkast, publicera, redigera, ta bort och återställa data från P2-01.
4. Mutationer ska uppdatera React-state omedelbart och sedan skriva till `localStorage`. Hantera skrivfel med en svensk, läsbar felstatus i API:t.
5. Wrappa sidans innehåll med providern i `app/layout.tsx` utan att ändra appens semantiska shell eller statiska exportbeteende.
6. Undvik hydration mismatch: visa fixture-kompatibelt innehåll tills den lokala state har lästs in, eller exponera en explicit `isHydrated`-flagga som konsumenter kan använda.

### Klart när

- Alla konsumenter kan få samma aktuella receptlista utan egna `localStorage`-anrop.
- En mutation uppdaterar katalog och kategoriräknare i samma klientsession.
- Sidan bygger utan server-renderingsfel från browser-API:er.

---

## P2-03 — Receptformulär, utkast och `Nytt recept`

**Prioritet:** hög  
**Kan påbörjas parallellt:** ja, använd P2-02:s hook-kontrakt  
**Ägda filer:** `app/components/new-post-button.tsx`, `app/components/recipe-editor-dialog.tsx`  
**Rör inte:** `app-shell.tsx`, `vault-catalog.tsx`, `lib/**`, `app/globals.css`

### Direkt instruktion

1. Ersätt fas 1-placeholdern i `new-post-button.tsx` med ett riktigt tillgängligt öppningsflöde för receptredigeraren. Behåll Escape- och utanför-klick-stängning.
2. Skapa `recipe-editor-dialog.tsx` som en återanvändbar Client Component för både nytt recept och redigering av ett publicerat recept.
3. Bygg formuläret med svenska etiketter och fält för titel, en eller flera kategorier, förberedelsetid, formulering, kontext, ingrediensrader och numrerade instruktioner.
4. Implementera lägg till/ta bort för ingrediensrader och instruktioner utan tredjepartsbibliotek.
5. Autospara till utkast med debounce. Ofullständiga utkast måste kunna återöppnas; publicering ska rensa utkastet.
6. Visa inline-validering efter interaktion och validera igen vid `Publicera`. Titel, minst en kategori, förberedelsetid, minst en ingrediens och minst ett steg krävs.
7. Vid misslyckad publicering: visa svenska felmeddelanden, sätt fokus på första felaktiga fältet och annonsera felet för skärmläsare.
8. Vid lyckad publicering: stäng dialogen och navigera till `/vault?recipe=<id>`.
9. Komponenten ska acceptera initiala data och callbacks så att P2-05 kan använda den vid redigering utan att duplicera formulärkod.

### Klart när

- Ett avbrutet nytt recept återställs efter sidomladdning.
- Ett komplett recept publiceras med P2-02:s API och kan därefter öppnas via klient-URL:en.
- Formuläret fungerar med tangentbord och har korrekt dialogsemantik.

---

## P2-04 — Lokal data i Vault-katalogen

**Prioritet:** hög  
**Kan påbörjas parallellt:** ja, använd P2-02:s hook-kontrakt  
**Ägda filer:** `app/components/vault-catalog.tsx`  
**Rör inte:** övriga filer

### Direkt instruktion

1. Byt katalogens direkta användning av fixture-arrayen mot den sammanslagna receptlistan från `useRecipeVault()`.
2. Behåll befintligt beteende för sökning, kategori, förberedelsetid, sortering, pagination och URL-state. Sökning ska omfatta titel, formulering, kontext och ingredienser.
3. Anpassa kategorifiltret till `categorySlugs`; ett recept med flera kategorier ska matcha varje vald kategori.
4. Behåll URL-konventionerna: sökning använder `router.replace`, avsiktliga filter/sortering/pagination använder `router.push`, och förändrade filter återställer `page`.
5. Ändra kortens `Öppna`-länk så att lokala recept öppnas med `/vault?recipe=<id>` medan orörda fixture-recept behåller `/recipes/<id>`.
6. Visa lokala ändringar direkt efter provider-mutationer. Se till att ogiltig sida och tomma resultat fortsatt hanteras säkert.
7. Ändra inte formulärmodalen eller global CSS i denna ticket.

### Klart när

- Ett publicerat eller redigerat lokalt recept kan hittas, filtreras, sorteras och pagineras.
- Ett borttaget recept försvinner ur resultat och antal.
- Befintliga fixtures beter sig som tidigare innan lokala data finns.

---

## P2-05 — Klientbaserad detaljvy och redigera/ta bort

**Prioritet:** hög  
**Kan påbörjas parallellt:** ja, använd P2-02 och P2-03:s publika kontrakt  
**Ägda filer:** `app/vault/page.tsx`, `app/components/vault-content.tsx`, `app/components/vault-recipe-detail.tsx`  
**Rör inte:** `vault-catalog.tsx`, `app/recipes/[id]/page.tsx`, `app/globals.css`

### Direkt instruktion

1. Behåll `app/vault/page.tsx` som server-wrapper med `Suspense`, men låt den rendera en ny client wrapper: `VaultContent`.
2. I `VaultContent`, läs `recipe` från query string. Rendera katalogen när parametern saknas och `VaultRecipeDetail` när den finns.
3. `VaultRecipeDetail` ska slå upp receptet från `useRecipeVault()` och visa breadcrumbs, titel, metadata, ingredienslista och numrerade steg i den etablerade svenska designen.
4. När ID:t saknas eller är borttaget: visa en svensk fallback med länk till `/vault`; kalla inte serverns `notFound()`.
5. Lägg till `Redigera` som öppnar P2-03:s återanvändbara editor med valda receptdata.
6. Lägg till `Ta bort` som först öppnar en tillgänglig bekräftelsedialog. Bekräftelsen ska nämna receptets titel. Efter bekräftad borttagning: navigera till `/vault`.
7. Allt ska fungera med tangentbord, Escape och fokusåtergång. Använd inte server-actions eller dynamiska recipe-routes.

### Klart när

- `/vault?recipe=<lokalt-id>` visar ett nytt eller redigerat recept efter omladdning.
- Fixture-recept kan öppnas genom query-parametern utan att deras statiska routes ändras.
- Redigering och bekräftad borttagning fungerar från detaljvyn.

---

## P2-06 — Kategorisidor med lokala och flera kategorier

**Prioritet:** medel  
**Kan påbörjas parallellt:** ja, använd P2-02:s hook-kontrakt  
**Ägda filer:** `app/kategorier/page.tsx`, `app/components/category-collection.tsx`  
**Rör inte:** `lib/**`, `vault-catalog.tsx`, `app/globals.css`

### Direkt instruktion

1. Behåll `app/kategorier/page.tsx` som enkel route-wrapper och rendera den nya Client Componenten `CategoryCollection` i en `Suspense`-säker struktur vid behov.
2. Flytta kategorikorten till `category-collection.tsx`.
3. Beräkna antalet från den sammanslagna receptlistan i `useRecipeVault()`.
4. Räkna ett recept en gång per kategori som dess `categorySlugs` innehåller.
5. Behåll kategorikortens befintliga länkar till `/vault?category=<slug>` och svenska copy.
6. Hantera providerns loading-state utan blinkande felaktiga siffror eller hydration mismatch.

### Klart när

- Nya, redigerade och borttagna recept påverkar samtliga berörda kategoriantal efter navigering eller omladdning.
- Ett fler-kategori-recept räknas i alla valda kategorier.

---

## P2-07 — Tillgänglighet, responsiv styling och releaseverifiering

**Prioritet:** hög  
**Kan påbörjas efter integration:** nej  
**Ägda filer:** `app/globals.css` samt små, nödvändiga a11y-korrigeringar i fas 2-komponenterna  
**Rör inte:** lagringslogik eller fixture-data

### Direkt instruktion

1. Gå igenom de mergerade fas 2-flödena på mobil och desktop: öppna formulär, autospara, validera, publicera, öppna detaljvy, redigera och ta bort.
2. Lägg till den minsta nödvändiga CSS:en i `app/globals.css` för formulär, radlistor, autosparstatus, bekräftelsedialog och detaljåtgärder.
3. Följ befintligt designspråk: varm canvas, terrakotta, mossmetadata, pappersytor, skarpa hörn, solida ramar och inga skuggor eller gradients.
4. Kontrollera att dialoger har korrekt fokus, att Escape fungerar, att utanför-klick inte avbryter osparad text utan avsiktligt beteende, och att fel/status är läsbara för skärmläsare.
5. Kontrollera 767px-brytpunkten. `Nytt recept` ska vara nåbart i sidhuvudet och sökningen ska fortsatt vara synlig på mobil.
6. Kör och åtgärda fel från `npx tsc --noEmit`, `npm run lint` och `npx next build --webpack`.
7. Gör en manuell regressionskontroll av de åtta statiska `/recipes/[id]`-sidorna och ogiltig recept-URL.

### Klart när

- Fas 2 är användbar på mobil och desktop med synliga fokuslägen och korrekt dialogbeteende.
- Alla tre releasekommandon passerar.
- Statisk export och befintliga fixture-routes fungerar utan regression.
