import { NextResponse } from "next/server";
import { isEditor, sameOrigin } from "@/lib/editor-auth";
import { readRecipe, RecipeDbError, softDeleteRecipe, writeRecipe } from "@/lib/recipe-db";
export const runtime = "nodejs";
const fail = (error: unknown) => NextResponse.json({ error: error instanceof RecipeDbError ? error.message : "Något gick fel." }, { status: error instanceof RecipeDbError ? error.status : 500 });
export async function GET(_request: Request, context: RouteContext<"/api/recipes/[id]">) { try { return NextResponse.json({ recipe: await readRecipe((await context.params).id) }); } catch (error) { return fail(error); } }
async function allowed(request: Request) { return sameOrigin(request) && await isEditor(); }
export async function PUT(request: Request, context: RouteContext<"/api/recipes/[id]">) { if (!await allowed(request)) return NextResponse.json({ error: "Redaktörsåtkomst krävs." }, { status: 401 }); try { return NextResponse.json(await writeRecipe(await request.json(), (await context.params).id)); } catch (error) { return fail(error); } }
export async function DELETE(request: Request, context: RouteContext<"/api/recipes/[id]">) { if (!await allowed(request)) return NextResponse.json({ error: "Redaktörsåtkomst krävs." }, { status: 401 }); try { return NextResponse.json(await softDeleteRecipe((await context.params).id)); } catch (error) { return fail(error); } }
