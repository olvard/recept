export const categories = [
  { name: "Lunch", slug: "lunch" },
  { name: "Middag", slug: "middag" },
  { name: "Matlådor", slug: "matlador" },
] as const;


/** The stable category label used when a fixture is shown in the phase 2 vault. */
export function getCategoryName(slug: string) {
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}
