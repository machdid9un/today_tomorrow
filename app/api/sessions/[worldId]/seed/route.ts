// PATCH /api/sessions/[worldId]/seed — 부모가 고른 '내일 이야기에 마음 담기' 저장. 소유: 역할 1.
// body: { preset: "courage" | "praise" | "company" | "rest" | "custom" | null, text?: string }
// worlds.next_seed_preset / next_seed_text 에 저장되고, 다음 회차의 contextStore가 읽어 간다.
import { NextResponse, type NextRequest } from "next/server";
import { canAccessWorld } from "@/lib/auth/worldAccess";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import type { SeedPreset } from "@/types";

export const runtime = "nodejs";

const PRESETS: SeedPreset[] = ["courage", "praise", "company", "rest", "custom"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await context.params;
  if (!worldId || !UUID_RE.test(worldId)) {
    return NextResponse.json({ error: "세계를 찾을 수 없습니다." }, { status: 404 });
  }
  const sbForAuth = getSupabaseServerClient();
  if (!(await canAccessWorld(sbForAuth, request, worldId))) {
    return NextResponse.json({ error: "세계를 찾을 수 없습니다." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { preset?: unknown; text?: unknown } | null;
  const preset = body?.preset === null ? null : (PRESETS as string[]).includes(String(body?.preset)) ? (body?.preset as SeedPreset) : undefined;
  if (preset === undefined) {
    return NextResponse.json({ error: "preset이 올바르지 않습니다." }, { status: 400 });
  }
  const text = preset === "custom" && typeof body?.text === "string" ? body.text.trim().slice(0, 200) : null;

  const sb = getSupabaseServerClient();
  const { data, error } = await sb
    .from("worlds")
    .update({ next_seed_preset: preset, next_seed_text: text })
    .eq("id", worldId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[sessions/seed] update failed", error);
    return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "세계를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true, preset, text });
}
