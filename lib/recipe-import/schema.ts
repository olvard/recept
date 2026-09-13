import { z } from "zod";
import { categories } from "@/lib/recipes";
import type { LlmExtraction } from "./types";

export const RecipeImportRequestSchema = z.object({
  url: z.string(),
}).strict();

const allowedCategorySlugs = categories.map((category) => category.slug) as [string, ...string[]];

export const LlmExtractionSchema = z.object({
  title: z.string().nullable(),
  note: z.string().nullable(),
  categorySlugs: z.array(z.enum(allowedCategorySlugs)).max(3),
  ingredients: z.array(z.string()).max(100),
  instructions: z.array(z.string()).max(100),
  prepMinutes: z.number().int().min(1).max(1_440).nullable(),
  cookMinutes: z.number().int().min(1).max(1_440).nullable(),
  totalMinutes: z.number().int().min(1).max(1_440).nullable(),
  servingsValue: z.number().positive().max(1_000).nullable(),
  servingsRawText: z.string().nullable(),
}).strict();

export type LlmExtractionSchemaType = z.infer<typeof LlmExtractionSchema>;

export function parseLlmExtraction(value: unknown): LlmExtraction {
  return LlmExtractionSchema.parse(value) as LlmExtraction;
}

export const LLM_ALLOWED_CATEGORY_SLUGS = allowedCategorySlugs;
