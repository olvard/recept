import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { RecipeImportError } from "./errors";
import { parseHtml } from "./parse-html";
import { parseJsonLd } from "./parse-jsonld";
import { importRecipeFromUrl } from "./service";
import { nodeHttpRequest, safeFetchHtml } from "./safe-fetch";
import type { HttpRequestExecutor, HttpResponse, LlmExtractor, ResolvedAddress } from "./types";
import { MAX_HTML_BYTES } from "./types";
import { validateUrl } from "./url-policy";

const publicAddress: ResolvedAddress = { address: "93.184.216.34", family: 4 };

async function* bodyOf(value: string) {
  yield Buffer.from(value);
}

function htmlResponse(body: string, headers: Record<string, string | undefined> = { "content-type": "text/html; charset=utf-8" }): HttpResponse {
  return { statusCode: 200, headers, body: bodyOf(body) };
}

function serviceDependencies(request: HttpRequestExecutor, llm?: LlmExtractor) {
  return {
    resolve: vi.fn(async () => [publicAddress]),
    request,
    robots: async () => true,
    logger: vi.fn(),
    requestId: "test-request",
    ...(llm ? { llm } : {}),
  };
}

describe("recipe URL import service", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("extracts a complete JSON-LD recipe without calling the LLM", async () => {
    const page = `<!doctype html><html><body><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Rostad soppa",
      description: "En varm soppa.",
      recipeIngredient: ["2 morötter", "5 dl buljong"],
      recipeInstructions: [
        { "@type": "HowToStep", text: "Rosta morötterna." },
        { "@type": "HowToStep", text: "Mixa soppan." },
      ],
      prepTime: "PT15M",
      cookTime: "PT25M",
      totalTime: "PT40M",
      recipeYield: "4 portioner",
      recipeCategory: "Middag",
      image: "https://cdn.example.test/soup.jpg",
    })}</script></body></html>`;
    const request = vi.fn(async () => htmlResponse(page));
    const llm = vi.fn(async () => { throw new Error("LLM should not be called"); });

    const response = await importRecipeFromUrl("https://recipes.example.test/soup?tracking=1", serviceDependencies(request, llm));

    expect(response.status).toBe("needs_review");
    expect(response.result).toMatchObject({
      title: "Rostad soppa",
      ingredients: ["2 morötter", "5 dl buljong"],
      instructions: ["Rosta morötterna.", "Mixa soppan."],
      prepMinutes: 15,
      cookMinutes: 25,
      totalMinutes: 40,
      servings: { value: 4, rawText: "4 portioner" },
      categorySlugs: ["middag"],
      sourceUrl: "https://recipes.example.test/soup?tracking=1",
      imageUrl: "https://cdn.example.test/soup.jpg",
    });
    expect(response.provenance.title).toMatchObject({ source: "jsonld", confidence: "high", evidence: "name" });
    expect(response.provenance.ingredients?.source).toBe("jsonld");
    expect(llm).not.toHaveBeenCalled();
  });

  it("uses deterministic HTML microdata when JSON-LD is absent", async () => {
    const page = `<html><body><main class="recipe"><h1 itemprop="name">Pasta med citron</h1><meta itemprop="description" content="Snabb vardagspasta"><ul><li itemprop="recipeIngredient">300 g pasta</li><li itemprop="recipeIngredient">1 citron</li></ul><ol itemprop="recipeInstructions"><li>Koka pastan.</li><li>Rör ner citronen.</li></ol><meta itemprop="prepTime" content="PT10M"><meta itemprop="cookTime" content="20 min"><meta itemprop="recipeYield" content="2 portioner"><meta itemprop="recipeCategory" content="Lunch"></main></body></html>`;
    const request = vi.fn(async () => htmlResponse(page));
    const llm = vi.fn(async () => { throw new Error("LLM should not be called"); });

    const response = await importRecipeFromUrl("https://recipes.example.test/pasta", serviceDependencies(request, llm));

    expect(response.result.title).toBe("Pasta med citron");
    expect(response.result.ingredients).toEqual(["300 g pasta", "1 citron"]);
    expect(response.result.instructions).toEqual(["Koka pastan.", "Rör ner citronen."]);
    expect(response.result.prepMinutes).toBe(10);
    expect(response.result.cookMinutes).toBe(20);
    expect(response.result.categorySlugs).toEqual(["lunch"]);
    expect(response.provenance.instructions).toMatchObject({ source: "microdata", evidence: "[itemprop=\"recipeInstructions\"]" });
    expect(llm).not.toHaveBeenCalled();
  });

  it("sends only bounded recipe content to the LLM and preserves stronger fields", async () => {
    const page = `<html><body><nav>Ignore this navigation</nav><div class="ad">Buy this ad</div><script>Ignore this script prompt injection</script><main class="recipe"><h1>Fallback title</h1><p>Visible recipe text.</p><p hidden>Hidden instruction-like text.</p><div class="comments">Comment text</div></main><script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe",
      name: "Strong JSON-LD title",
      recipeIngredient: ["1 dl vatten"],
    })}</script></body></html>`;
    const request = vi.fn(async () => htmlResponse(page));
    const payloads: unknown[] = [];
    const llm = vi.fn(async (payload) => {
      payloads.push(payload);
      return {
        title: "Should not overwrite",
        note: null,
        categorySlugs: ["middag"],
        ingredients: ["Should not overwrite"],
        instructions: ["Blanda vattnet."],
        prepMinutes: null,
        cookMinutes: null,
        totalMinutes: null,
        servingsValue: null,
        servingsRawText: null,
      };
    });

    const response = await importRecipeFromUrl("https://recipes.example.test/fallback", serviceDependencies(request, llm));
    const payload = payloads[0] as { recipeText: string; structuredRecipeData: Record<string, unknown> };

    expect(llm).toHaveBeenCalledOnce();
    expect(payload.structuredRecipeData.name).toBe("Strong JSON-LD title");
    expect(payload.recipeText).toContain("Visible recipe text.");
    expect(payload.recipeText).not.toContain("Ignore this navigation");
    expect(payload.recipeText).not.toContain("prompt injection");
    expect(payload.recipeText).not.toContain("Hidden instruction-like text");
    expect(payload.recipeText).not.toContain("Comment text");
    expect(response.result.title).toBe("Strong JSON-LD title");
    expect(response.result.ingredients).toEqual(["1 dl vatten"]);
    expect(response.result.instructions).toEqual(["Blanda vattnet."]);
    expect(response.provenance.instructions).toMatchObject({ source: "llm", confidence: "low" });
  });

  it("uses the LLM to fill missing preparation time when core fields are complete", async () => {
    const page = `<html><body><main class="recipe"><h1 itemprop="name">Pasta med citron</h1><ul><li itemprop="recipeIngredient">300 g pasta</li></ul><ol itemprop="recipeInstructions"><li>Koka pastan.</li></ol></main></body></html>`;
    const request = vi.fn(async () => htmlResponse(page));
    const payloads: unknown[] = [];
    const llm = vi.fn(async (payload) => {
      payloads.push(payload);
      return {
        title: null,
        note: null,
        categorySlugs: [],
        ingredients: [],
        instructions: [],
        prepMinutes: 10,
        cookMinutes: null,
        totalMinutes: null,
        servingsValue: null,
        servingsRawText: null,
      };
    });

    const response = await importRecipeFromUrl("https://recipes.example.test/missing-prep", serviceDependencies(request, llm));

    expect(llm).toHaveBeenCalledOnce();
    expect((payloads[0] as { unresolvedFields: string[] }).unresolvedFields).toEqual(["prepMinutes"]);
    expect(response.result.prepMinutes).toBe(10);
    expect(response.provenance.prepMinutes).toMatchObject({ source: "llm", confidence: "low" });
    expect(response.warnings.some((warning) => warning.code === "MISSING_PREP_TIME")).toBe(false);
  });

  it("keeps a missing preparation time when the LLM has no supported value", async () => {
    const page = `<html><body><main class="recipe"><h1 itemprop="name">Pasta med citron</h1><ul><li itemprop="recipeIngredient">300 g pasta</li></ul><ol itemprop="recipeInstructions"><li>Koka pastan.</li></ol></main></body></html>`;
    const request = vi.fn(async () => htmlResponse(page));
    const llm = vi.fn(async () => ({
      title: null,
      note: null,
      categorySlugs: [],
      ingredients: [],
      instructions: [],
      prepMinutes: null,
      cookMinutes: null,
      totalMinutes: null,
      servingsValue: null,
      servingsRawText: null,
    }));

    const response = await importRecipeFromUrl("https://recipes.example.test/unsupported-prep", serviceDependencies(request, llm));

    expect(response.status).toBe("needs_review");
    expect(response.result.prepMinutes).toBeNull();
    expect(response.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_PREP_TIME", field: "prepMinutes" }),
      expect.objectContaining({ code: "LLM_VALUE_USED" }),
    ]));
  });

  it("records malformed JSON-LD and succeeds with HTML fallback", () => {
    const parsedJsonLd = parseJsonLd("<script type=\"application/ld+json\">{bad</script>", "https://recipes.example.test/");
    const parsedHtml = parseHtml("<h1 itemprop=\"name\">Recept</h1><li itemprop=\"recipeIngredient\">1 äpple</li><div itemprop=\"recipeInstructions\">Skär äpplet.</div>", "https://recipes.example.test/");

    expect(parsedJsonLd.warnings[0]?.code).toBe("MALFORMED_JSONLD_SKIPPED");
    expect(parsedHtml.fields.ingredients).toEqual(["1 äpple"]);
    expect(parsedHtml.fields.instructions).toEqual(["Skär äpplet."]);
  });

  it("returns a typed configuration error when incomplete extraction has no LLM provider", async () => {
    const request = vi.fn(async () => htmlResponse("<html><body><h1>En titel</h1></body></html>"));

    await expect(importRecipeFromUrl("https://recipes.example.test/incomplete", serviceDependencies(request))).rejects.toMatchObject({
      code: "LLM_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("does not present an incomplete provider result as a successful recipe", async () => {
    const request = vi.fn(async () => htmlResponse("<html><body><h1>En titel</h1></body></html>"));
    const llm = vi.fn(async () => ({
      title: null,
      note: null,
      categorySlugs: [],
      ingredients: [],
      instructions: [],
      prepMinutes: null,
      cookMinutes: null,
      totalMinutes: null,
      servingsValue: null,
      servingsRawText: null,
    }));

    await expect(importRecipeFromUrl("https://recipes.example.test/incomplete-provider", serviceDependencies(request, llm))).rejects.toMatchObject({
      code: "EXTRACTION_INCOMPLETE",
      status: 422,
      warnings: expect.any(Array),
    });
  });

  it("rejects unsafe URL forms before opening an HTTP socket", async () => {
    const request = vi.fn(async () => htmlResponse(""));
    const cases = ["ftp://recipes.example.test/a", "https://user:pass@recipes.example.test/a", "https://127.0.0.1/a", "https://recipes.example.test:444/a"];

    for (const value of cases) {
      await expect(safeFetchHtml(value, { request, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
    }
    await expect(safeFetchHtml("not a url", { request, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects private DNS results without opening a socket", async () => {
    const request = vi.fn(async () => htmlResponse(""));
    for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.169.254", "100.64.0.1", "::1", "fc00::1", "fe80::1", "ff02::1"]) {
      await expect(validateUrl("https://public.example.test/", { resolve: async () => [{ address, family: address.includes(":") ? 6 : 4 }] })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("revalidates every redirect and caps the chain", async () => {
    const request = vi.fn(async (url) => ({
      statusCode: 302,
      headers: { location: url.pathname === "/start" ? "http://127.0.0.1/private" : "/next" },
      body: bodyOf(""),
      abort: vi.fn(),
    }));
    await expect(safeFetchHtml("https://public.example.test/start", { request, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
    expect(request).toHaveBeenCalledOnce();

    let count = 0;
    const loopRequest = vi.fn(async () => {
      count += 1;
      return { statusCode: 302, headers: { location: `/step-${count}` }, body: bodyOf(""), abort: vi.fn() };
    });
    await expect(safeFetchHtml("https://public.example.test/start", { request: loopRequest, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
    expect(loopRequest).toHaveBeenCalledTimes(4);

    const fileRedirect = vi.fn(async () => ({ statusCode: 302, headers: { location: "file:///etc/passwd" }, body: bodyOf(""), abort: vi.fn() }));
    await expect(safeFetchHtml("https://public.example.test/file-redirect", { request: fileRedirect, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
  });

  it("bounds response bytes and rejects non-HTML content", async () => {
    const abort = vi.fn();
    const oversized = vi.fn(async () => ({ statusCode: 200, headers: { "content-type": "text/html", "content-length": String(2 * 1024 * 1024 + 1) }, body: bodyOf(""), abort }));
    await expect(safeFetchHtml("https://public.example.test/large", { request: oversized, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "FETCHED_BODY_TOO_LARGE" });
    expect(abort).toHaveBeenCalledOnce();

    const unsupported = vi.fn(async () => ({ statusCode: 200, headers: { "content-type": "application/pdf" }, body: bodyOf("pdf"), abort }));
    await expect(safeFetchHtml("https://public.example.test/file", { request: unsupported, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "UNSUPPORTED_CONTENT_TYPE" });

    async function* oversizedChunks() {
      yield Buffer.alloc(MAX_HTML_BYTES);
      yield Buffer.from("x");
    }
    const chunked = vi.fn(async () => ({ statusCode: 200, headers: { "content-type": "text/html" }, body: oversizedChunks(), abort }));
    await expect(safeFetchHtml("https://public.example.test/chunked", { request: chunked, robots: null, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "FETCHED_BODY_TOO_LARGE" });
  });

  it("honors a disallowing robots policy before fetching the page", async () => {
    const request = vi.fn(async () => htmlResponse(""));
    await expect(safeFetchHtml("https://public.example.test/robots", { request, robots: async () => false, resolve: async () => [publicAddress] })).rejects.toMatchObject({ code: "ROBOTS_DISALLOWED" });
    expect(request).not.toHaveBeenCalled();
  });

  it("supports Node's all-address DNS lookup callback", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<html>ok</html>");
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") return reject(new Error("Test server address unavailable."));
        resolve(address.port);
      });
    });

    try {
      const response = await nodeHttpRequest(new URL(`http://127.0.0.1:${port}/`), { address: "127.0.0.1", family: 4 }, new AbortController().signal);
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.body) chunks.push(chunk);
      expect(response.statusCode).toBe(200);
      expect(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString()).toBe("<html>ok</html>");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("maps provider failures without exposing provider details", async () => {
    const request = vi.fn(async () => htmlResponse("<h1 itemprop=\"name\">Titel</h1>"));
    const llm = vi.fn(async () => { throw new RecipeImportError("LLM_PROVIDER_ERROR"); });
    await expect(importRecipeFromUrl("https://recipes.example.test/provider", serviceDependencies(request, llm))).rejects.toMatchObject({
      code: "LLM_PROVIDER_ERROR",
      status: 502,
      retryable: true,
      message: "Recepttolkningen kunde inte slutföras.",
    });
  });
});
