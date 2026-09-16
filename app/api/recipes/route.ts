import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/request-origin";
import { readIndex, RecipeDbError, writeRecipe } from "@/lib/recipe-db";
export const runtime = "nodejs";
const fail = (error: unknown) => NextResponse.json({ error: error instanceof RecipeDbError ? error.message : "Något gick fel." }, { status: error instanceof RecipeDbError ? error.status : 500 });
export async function GET() { try { return NextResponse.json({ recipes: await readIndex() }); } catch (error) { return fail(error); } }
export async function POST(request: Request) { if (!sameOrigin(request)) return NextResponse.json({ error: "Otillåten begäran." }, { status: 403 }); try { return NextResponse.json(await writeRecipe(await request.json())); } catch (error) { return fail(error); } }
