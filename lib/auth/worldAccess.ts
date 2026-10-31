// 세계·회차 소유권 검사. 소유: 역할 1.
// 여러 API 라우트에 "TODO(역할 1): 게스트 쿠키/로그인 세션으로 소유권 검사"로 남아 있던 부분을 채운다.
// worldId만 알면 누구나 조회·수정할 수 있던 문제를 막는다.
//
// 두 가지 증명 방식을 쓴다(README §9):
// 1) 게스트 세계(owner_user_id가 없음): guest_token 쿠키 → worlds.guest_token_hash와 일치해야 한다.
//    게스트는 기기 하나짜리라, 세계당 쿠키 하나로 충분하다(app/api/sessions/route.ts와 같은 방식).
// 2) 로그인한 세계(owner_user_id가 있음): sb_access_token 쿠키(로그인 때 발급한 Supabase 세션
//    액세스 토큰)의 유저 id가 worlds.owner_user_id와 같아야 한다. 계정은 여러 기기에서 동시에
//    로그인할 수 있어서, 게스트처럼 "세계당 토큰 하나"로는 다른 기기를 로그아웃시켜 버리므로
//    대신 토큰 자체(JWT)를 매번 검증한다.
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;

export const GUEST_COOKIE_NAME = "guest_token";
export const ACCESS_TOKEN_COOKIE_NAME = "sb_access_token";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * sb_access_token 쿠키가 있고 유효하면 그 유저 id, 아니면 null.
 * 주의: 검증은 항상 새 클라이언트 인스턴스로 한다. auth.signInWithPassword처럼 클라이언트의
 * 내부 세션을 바꿔 버리는 호출과 같은 인스턴스를 재사용하면, 그 뒤 DB 조회가 service_role이
 * 아니라 그 유저 권한(RLS에 막힘)으로 나가는 사고가 난다(app/api/auth/login에서 실제로 겪음).
 * getUser(token)에 토큰을 명시하면 그 호출 자체는 내부 세션을 안 바꾸지만, 만에 하나를 위해
 * 아예 검증 전용 인스턴스를 쓴다.
 */
export async function getLoggedInUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const authClient = getSupabaseServerClient();
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** 이 요청이 이 worldId에 접근할 권한이 있는지. */
export async function canAccessWorld(
  sb: SupabaseServerClient,
  request: NextRequest,
  worldId: string
): Promise<boolean> {
  const { data: world } = await sb
    .from("worlds")
    .select("owner_user_id, guest_token_hash")
    .eq("id", worldId)
    .maybeSingle();
  if (!world) return false;

  if (world.owner_user_id) {
    const userId = await getLoggedInUserId(request);
    return userId !== null && userId === world.owner_user_id;
  }

  const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;
  if (!token || !world.guest_token_hash) return false;
  return sha256(token) === world.guest_token_hash;
}

/** 이 요청이 이 episodeId가 속한 세계에 접근할 권한이 있는지(world_id를 먼저 찾는다). */
export async function canAccessEpisode(
  sb: SupabaseServerClient,
  request: NextRequest,
  episodeId: string
): Promise<boolean> {
  const { data: episode } = await sb.from("episodes").select("world_id").eq("id", episodeId).maybeSingle();
  if (!episode?.world_id) return false;
  return canAccessWorld(sb, request, episode.world_id);
}

/**
 * 로그인/회원가입 성공 시 호출: 그 세션의 액세스 토큰을 쿠키로 심어 둔다. 이후 요청마다
 * getLoggedInUserId가 이 쿠키를 읽어 "이 유저가 로그인한 유저가 맞는지" 확인한다.
 * 액세스 토큰 수명(보통 1시간) 동안만 유효 — 그 뒤엔 다시 로그인해야 한다(새로고침 없음, 의도적으로
 * 범위를 좁힌 부분. README §9-계정 참고).
 */
export function setAccessTokenCookie(res: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } }, accessToken: string, expiresInSec: number): void {
  res.cookies.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, expiresInSec),
  });
}
