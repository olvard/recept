import { NextResponse } from "next/server";
import { editorCookie, sameOrigin, sessionValue } from "@/lib/editor-auth";

export const runtime = "nodejs";
export async function POST(request: Request) { if (!sameOrigin(request)) return NextResponse.json({ error: "Otillåten begäran." }, { status: 403 }); const body = await request.json().catch(() => null) as { password?: unknown } | null; if (!process.env.RECEPT_ADMIN_PASSWORD || typeof body?.password !== "string" || body.password !== process.env.RECEPT_ADMIN_PASSWORD) return NextResponse.json({ error: "Fel lösenord." }, { status: 401 }); const response = NextResponse.json({ ok: true }); response.cookies.set(editorCookie.name, sessionValue(), editorCookie.options); return response; }
export async function DELETE(request: Request) { if (!sameOrigin(request)) return NextResponse.json({ error: "Otillåten begäran." }, { status: 403 }); const response = NextResponse.json({ ok: true }); response.cookies.set(editorCookie.name, "", { ...editorCookie.options, maxAge: 0 }); return response; }
