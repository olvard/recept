# Recept — PRD för fas 2

## 1. Produktdefinition

**Produkt:** Recept — Personal Recipe Vault  
**Fas:** 2 — skapa och hantera recept  
**Status:** Beslutad riktning för implementation

Fas 2 utökar den statiska, läsbara receptprototypen med ett lokalt arbetsflöde för att skapa, redigera och ta bort recept. Receptdata sparas i användarens webbläsare och lämnar inte enheten.

Den befintliga arkivkänslan, svenska gränssnittstexter och statiska exportmodell ska bevaras.

## 2. Mål

- Användaren ska kunna skapa ett komplett recept från `Nytt recept`.
- Användaren ska kunna redigera befintliga fixture-recept och lokala recept.
- Användaren ska kunna ta bort recept med ett tydligt bekräftelsesteg.
- Utkast ska autosparas lokalt så att avbrutet arbete kan återupptas.
- Lokala recept ska överleva omladdning och omstart av webbläsaren.
- Lösningen ska fortsätta fungera med Next.js `output: "export"` och statisk hosting.

## 3. Icke-mål

Följande ingår inte i fas 2:

- Backend, API eller molndatabas.
- Inloggning eller användarkonton.
- Synkning mellan enheter eller webbläsare.
- Bilduppladdning eller receptbilder.
- Kryptering, offline-funktionalitet utöver webbläsarens lokala lagring.
- Import/export av recept.
- Anpassade kategorier.
- Cook mode, portionsskalning eller checklistor.
- Markdown-editor.

## 4. Lagring och datalivscykel

### 4.1 Lagringsmodell

Använd `localStorage` som primär lagringsmekanism för fas 2.

- Fixture-data i `data/recipes.json` ska fortsatt vara källan för de åtta ursprungliga recepten.
- Användarens ändringar ska sparas som lokala överlagringar; fixture-filen ska aldrig muteras från klienten.
- Nya recept, redigeringar, borttagningar och utkast ska lagras lokalt.
- Alla läsningar från `localStorage` måste ske klient-side efter hydration.
- Om lagringen saknas, är korrupt eller inte kan parsas ska appen falla tillbaka till fixture-data och visa ett återhämtningsbart fel.

Rekommenderade nycklar:

- `recept.phase2.recipes.v1` — publicerade lokala recept och ändringar.
- `recept.phase2.drafts.v1` — autosparade utkast.
- `recept.phase2.deleted.v1` — fixture-ID:n som användaren har tagit bort.

En versionsprefixad lagringsnyckel ska användas så att framtida datamigreringar kan införas utan att befintlig data tyst förloras.

### 4.2 Publicering och utkast

- Ett nytt recept sparas som utkast medan användaren skriver.
- Autospara sker med debounce efter ändringar.
- Ett utkast får inget permanent arkivnummer förrän det publiceras.
- Vid publicering skapas arkivnummer och arkivdatum automatiskt.
- Ett publicerat recept tas bort från utkastlagringen.
- Om användaren lämnar formuläret ska ett befintligt utkast kunna återupptas.

### 4.3 Arkivmetadata

- Arkivnummer genereras automatiskt och ska vara unikt bland fixture-recept, lokala recept och kvarvarande historik.
- Formatet ska följa befintliga tvåsiffriga arkivnummer där det är möjligt, exempelvis `#049` efter `#048`.
- Arkivdatum genereras vid publicering och används av sorteringen `Senast arkiverade`.
- Användaren ska inte behöva ange eller redigera dessa värden i formuläret.

## 5. Receptformulär

### 5.1 Obligatoriska fält

Följande fält krävs för publicering:

- Titel.
- Minst en kategori.
- Förberedelsetid.
- Minst en ingrediensrad.
- Minst ett instruk­tionssteg.

Formuläret kan dessutom innehålla:

- Kort formulering eller introduktion.
- Ingrediensens mängd och namn.
- Instruktionstext.
- Valfria metadatafält som följer befintlig receptmodell.

### 5.2 Kategorier

Ett recept kan tillhöra flera kategorier. Fas 2 ska stödja de befintliga kategorierna:

- `Lunch` (`lunch`)
- `Middag` (`middag`)
- `Matlådor` (`matlador`)

Minst en kategori krävs vid publicering. Kategorifilter och kategorisidor ska inkludera receptet i varje vald kategori.

### 5.3 Validering

Validering ska ske både inline och vid publicering.

- Inline-feedback visas efter att ett fält har berörts eller ändrats.
- Publicering blockerar om obligatoriska fält saknas eller innehåller ogiltiga värden.
- Felmeddelanden ska vara på svenska och kopplade till rätt formulärfält.
- Fokus ska flyttas till det första felaktiga fältet vid misslyckad publicering.
- Utkast får vara ofullständiga och ska kunna sparas utan publiceringsvalidering.

## 6. Användarflöden

### 6.1 Skapa recept

1. Användaren väljer `Nytt recept` i applikationsskalet.
2. Ett tillgängligt receptformulär öppnas.
3. Formuläret autosparar ett lokalt utkast.
4. Användaren väljer `Publicera` när valideringen är godkänd.
5. Receptet får automatiskt arkivnummer och arkivdatum.
6. Användaren skickas till den nya klientbaserade detaljvyn.

### 6.2 Redigera recept

- Befintliga fixture-recept och lokala recept ska kunna redigeras.
- Redigering skapar en lokal överlagring för fixture-receptet.
- Originaldata i `data/recipes.json` ska finnas kvar som återställningsbar bas.
- Formuläret ska tydligt visa om användaren redigerar ett utkast eller ett publicerat recept.

### 6.3 Ta bort recept

- `Ta bort recept` ska kräva bekräftelse i en tillgänglig dialog.
- Dialogen ska tydligt visa vilket recept som tas bort.
- Vid bekräftelse tas lokala recept bort och fixture-recept markeras som borttagna lokalt.
- Avbryt ska lämna receptet oförändrat.
- Efter borttagning ska användaren återvända till `/vault` med säker sid- och filterhantering.

## 7. Routing och visning

Lokala recept ska inte kräva nya statiskt genererade `/recipes/[id]`-sidor. De ska öppnas genom en klientbaserad detaljvy på:

`/vault?recipe=<id>`

Krav:

- Befintliga statiska fixture-routes på `/recipes/[id]` ska fortsätta fungera.
- `/vault?recipe=<id>` ska kunna visa både lokala och fixture-baserade recept.
- Ogiltigt eller borttaget lokalt ID ska visa en svensk, varumärkesanpassad fallback och länk tillbaka till `Vault`.
- Detaljvyn ska ha samma shell, breadcrumbs, metadata, ingredienslista och numrerade instruktioner som befintliga receptdetaljer.
- Redigering ska kunna öppnas från detaljvyn utan att förlora utkast.

## 8. Katalogintegration

Lokalt skapade och redigerade recept ska använda samma katalogfunktioner som fixture-recept:

- Sökning på titel, ingredienser och formulering.
- Kategorifiltrering, inklusive flera kategorier.
- Förberedelsetidsfilter.
- Sortering efter arkivdatum, arkivnummer och alfabetisk ordning.
- Pagination.
- URL-state för katalogens befintliga parametrar.

När en ändring påverkar katalogen ska resultat, antal och sidhantering uppdateras utan att skapa inkonsekventa URL-parametrar.

## 9. Tillgänglighet och gränssnitt

- Behåll befintliga svenska produktord: `Recept`, `Vault`, `Kategorier`, `Nytt recept`.
- Använd semantiska formulärfält med synliga eller korrekt associerade etiketter.
- Behåll synliga fokusmarkeringar.
- Dialoger ska stödja tangentbord, `Escape`, fokusstyrning och tydliga `aria`-attribut.
- Autosparstatus ska kommuniceras med exempelvis `Sparar utkast`, `Utkast sparat` eller ett svenskt felmeddelande.
- Publicerings-, redigerings- och borttagningsresultat ska kunna uppfattas av skärmläsare.
- Behåll befintlig mobil-first-layout och `767px`-brytpunkt.

## 10. Tekniska begränsningar

- Ingen server-only runtime dependency.
- Ingen extern datahämtning.
- Ingen tredjeparters UI-komponentbibliotek.
- Klientkomponenter ska kapsla browser-API-användning och skydda mot hydration-problem.
- Den befintliga statiska exporten ska fortsätta fungera.
- Fixture-typer och taxonomi ska fortsatt importeras genom `lib/recipes.ts`.
- Datamodellen ska vara utbyggbar för framtida export, kryptering och synkning.

## 11. Acceptanskriterier

Fas 2 är godkänd när:

1. Ett komplett recept kan skapas, publiceras och visas i den klientbaserade detaljvyn.
2. Ett ofullständigt recept kan autosparas som utkast och återupptas efter omladdning.
3. Ett publicerat recept finns kvar efter att webbläsaren startats om.
4. Befintliga och nya recept kan redigeras.
5. Recept kan tas bort efter bekräftelse och försvinner från katalog, kategorier och detaljvy.
6. Ett recept kan ha flera kategorier och visas under samtliga valda kategorier.
7. Arkivnummer och arkivdatum skapas automatiskt och ger deterministisk sortering.
8. Validering fungerar inline och vid publicering med svenska, tillgängliga felmeddelanden.
9. Nya recept kan öppnas via `/vault?recipe=<id>` utan backend eller dynamisk server-route.
10. `npx tsc --noEmit`, `npm run lint` och `npx next build --webpack` passerar.

## 12. Framtida utbyggnad

Fas 3 kan bygga vidare med anpassade kategorier, import/export, offline-lagring, kryptering och synkning utan att ändra användarens grundläggande receptformulär.
