// POST /api/sessions — 게스트/회원 모험 생성 → worldId, episodeId. 소유: 역할 1.
// 지금은 게스트 전용 구현 (매직링크 로그인은 P1, 붙기 전까지 owner_user_id는 항상 null).
// README §9 접근 제어: 게스트 토큰은 HttpOnly 쿠키로만 들고 있고, DB엔 해시만 저장한다.
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_COOKIE_NAME = "guest_token";
const GUEST_TTL_MS = 48 * 60 * 60 * 1000; // 48시간. 장기 보관을 보장하지 않는 임시 세션(README §3.A).

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(_request: Request) {
  const sb = getSupabaseServerClient();

  const guestToken = randomBytes(32).toString("hex");
  const guestTokenHash = sha256(guestToken);
  const guestExpiresAt = new Date(Date.now() + GUEST_TTL_MS).toISOString();

  const { data: world, error: worldErr } = await sb
    .from("worlds")
    .insert({
      owner_user_id: null,
      guest_token_hash: guestTokenHash,
      guest_expires_at: guestExpiresAt,
    })
    .select("id")
    .single();

  if (worldErr || !world) {
    console.error("[sessions] world insert failed", worldErr);
    return NextResponse.json({ error: "세계를 만들지 못했습니다." }, { status: 500 });
  }

  const { data: episode, error: episodeErr } = await sb
    .from("episodes")
    .insert({
      world_id: world.id,
      episode_number: 1,
      status: "active",
    })
    .select("id")
    .single();

  if (episodeErr || !episode) {
    console.error("[sessions] episode insert failed", episodeErr);
    // 에피소드 생성이 실패했으면 고아 world 행을 남기지 않도록 최선을 다해 정리한다.
    await sb.from("worlds").delete().eq("id", world.id);
    return NextResponse.json({ error: "회차를 만들지 못했습니다." }, { status: 500 });
  }

  const res = NextResponse.json({ worldId: world.id, episodeId: episode.id });
  res.cookies.set(GUEST_COOKIE_NAME, guestToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_TTL_MS / 1000,
  });
  return res;
}
