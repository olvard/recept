import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isEditor: vi.fn(),
  sameOrigin: vi.fn(),
  importRecipeFromUrl: vi.fn(),
}));

vi.mock("@/lib/editor-auth", () => ({
  isEditor: mocks.isEditor,
  sameOrigin: mocks.sameOrigin,
}));
vi.mock("@/lib/recipe-import/service", () => ({
  importRecipeFromUrl: mocks.importRecipeFromUrl,
}));

import { POST } from "./route";

function request(body: string, contentType = "application/json") {
  return new Request("http://localhost:3000/api/recipe-import", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("POST /api/recipe-import", () => {
  beforeEach(() => {
    mocks.isEditor.mockClear();
    mocks.sameOrigin.mockClear();
    mocks.importRecipeFromUrl.mockClear();
    vi.stubEnv("RECEPT_ADMIN_PASSWORD", "admin");
    vi.stubEnv("RECEPT_SESSION_SECRET", "secret");
    mocks.sameOrigin.mockReturnValue(true);
    mocks.isEditor.mockResolvedValue(true);
    mocks.importRecipeFromUrl.mockResolvedValue({ status: "needs_review", result: { title: "Test" }, provenance: {}, warnings: [] });
  });

  it("rejects cross-origin requests before authentication or fetching", async () => {
    mocks.sameOrigin.mockReturnValue(false);

    const response = await POST(request(JSON.stringify({ url: "https://recipes.example.test/" })));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ORIGIN_NOT_ALLOWED", retryable: false });
    expect(mocks.isEditor).not.toHaveBeenCalled();
    expect(mocks.importRecipeFromUrl).not.toHaveBeenCalled();
  });

  it("requires an editor session", async () => {
    mocks.isEditor.mockResolvedValue(false);

    const response = await POST(request(JSON.stringify({ url: "https://recipes.example.test/" })));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "EDITOR_AUTH_REQUIRED", retryable: false });
    expect(mocks.importRecipeFromUrl).not.toHaveBeenCalled();
  });

  it("reports missing authentication configuration", async () => {
    vi.stubEnv("RECEPT_SESSION_SECRET", "");

    const response = await POST(request(JSON.stringify({ url: "https://recipes.example.test/" })));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "AUTH_NOT_CONFIGURED", retryable: false });
    expect(mocks.isEditor).not.toHaveBeenCalled();
  });

  it("enforces JSON and the request body limit", async () => {
    const contentTypeResponse = await POST(request(JSON.stringify({ url: "https://recipes.example.test/" }), "text/plain"));
    expect(contentTypeResponse.status).toBe(400);

    const largeResponse = await POST(request(JSON.stringify({ url: `https://recipes.example.test/${"x".repeat(8_192)}` })));
    expect(largeResponse.status).toBe(413);
    expect(await largeResponse.json()).toMatchObject({ code: "REQUEST_TOO_LARGE" });
    expect(mocks.importRecipeFromUrl).not.toHaveBeenCalled();
  });

  it("passes a valid request to the import service", async () => {
    const response = await POST(request(JSON.stringify({ url: "https://recipes.example.test/recipe" })));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "needs_review" });
    expect(mocks.importRecipeFromUrl).toHaveBeenCalledWith("https://recipes.example.test/recipe", expect.objectContaining({ requestId: expect.any(String) }));
  });
});
