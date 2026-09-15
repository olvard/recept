import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isEditor, sameOrigin } from "@/lib/editor-auth";
import { asRecipeImportError, RecipeImportError } from "@/lib/recipe-import/errors";
import { RecipeImportRequestSchema } from "@/lib/recipe-import/schema";
import { importRecipeFromUrl } from "@/lib/recipe-import/service";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/recipe-import/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: RecipeImportError, requestId: string) {
  return NextResponse.json({
    error: error.message,
    code: error.code,
    retryable: error.retryable,
    ...(error.warnings ? { warnings: error.warnings } : {}),
    requestId,
  }, { status: error.status });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  if (!sameOrigin(request)) return errorResponse(new RecipeImportError("ORIGIN_NOT_ALLOWED"), requestId);
  if (!process.env.RECEPT_ADMIN_PASSWORD || !process.env.RECEPT_SESSION_SECRET) {
    return errorResponse(new RecipeImportError("AUTH_NOT_CONFIGURED"), requestId);
  }

  let editor = false;
  try {
    editor = await isEditor();
  } catch {
    return errorResponse(new RecipeImportError("AUTH_NOT_CONFIGURED"), requestId);
  }
  if (!editor) return errorResponse(new RecipeImportError("EDITOR_AUTH_REQUIRED"), requestId);

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return errorResponse(new RecipeImportError("INVALID_REQUEST"), requestId);

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return errorResponse(new RecipeImportError("INVALID_REQUEST"), requestId);
  }
  if (Buffer.byteLength(bodyText, "utf8") > MAX_REQUEST_BODY_BYTES) {
    return errorResponse(new RecipeImportError("REQUEST_TOO_LARGE"), requestId);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return errorResponse(new RecipeImportError("INVALID_REQUEST"), requestId);
  }
  const parsed = RecipeImportRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(new RecipeImportError("INVALID_REQUEST"), requestId);

  try {
    const result = await importRecipeFromUrl(parsed.data.url, { requestId });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(asRecipeImportError(error), requestId);
  }
}
