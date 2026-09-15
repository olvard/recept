import { categories } from "@/lib/recipes";

const exactMappings: Record<string, string> = {
  lunch: "lunch",
  "lunch dish": "lunch",
  brunch: "lunch",
  middag: "middag",
  dinner: "middag",
  supper: "middag",
  "main course": "middag",
  entree: "middag",
  "matlåda": "matlador",
  matlådor: "matlador",
  "meal prep": "matlador",
  lunchbox: "matlador",
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function mapCategories(rawValues: string[]) {
  const categorySlugs: string[] = [];
  const categoryCandidates: string[] = [];

  for (const rawValue of rawValues) {
    const value = clean(rawValue);
    if (!value) continue;
    const normalized = value.toLocaleLowerCase("sv-SE");
    const mapped = exactMappings[normalized];
    if (mapped && categories.some((category) => category.slug === mapped)) {
      if (!categorySlugs.includes(mapped)) categorySlugs.push(mapped);
      if (!categoryCandidates.includes(mapped)) categoryCandidates.push(mapped);
      continue;
    }
    if (!categoryCandidates.includes(value)) categoryCandidates.push(value);
  }

  return { categorySlugs, categoryCandidates };
}
