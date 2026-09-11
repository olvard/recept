import { RecipeDetail } from "@/app/components/recipe-detail";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return <RecipeDetail id={(await params).id} />;
}
