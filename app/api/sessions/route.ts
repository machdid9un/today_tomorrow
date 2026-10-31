// POST /api/sessions — 게스트/회원 모험 생성 → worldId, episodeId. 소유: 역할 1.
// 지금은 게스트 전용 구현 (매직링크 로그인은 P1, 붙기 전까지 owner_user_id는 항상 null).
// README §9 접근 제어: 게스트 토큰은 HttpOnly 쿠키로만 들고 있고, DB엔 해시만 저장한다.
//
// 이어하기 규칙(README §3.A "같은 기기에서 다음 날 앱을 열면 게스트 쿠키로 2화가 1화를 이어갑니다"):
// 요청에 유효기간이 남은 guest_token 쿠키가 있으면 새 세계를 만들지 않고 그 세계를 이어서 쓴다.
//   - 세계의 최신 회차가 아직 active면 그 회차를 그대로 돌려준다(새로고침·재접속 등).
//   - 최신 회차가 completed면 다음 회차(episode_number+1)를 새로 만들어 돌려준다(기억은
//     /complete 때 이미 worlds.memory_json에 저장돼 있어 loadEpisodeContext가 그대로 읽음).
// 쿠키가 없거나 만료됐으면 기존처럼 새 세계 + 1화를 만든다.
import { createHash, randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_COOKIE_NAME = "guest_token";
const GUEST_TTL_MS = 48 * 60 * 60 * 1000; // 48시간. 장기 보관을 보장하지 않는 임시 세션(README §3.A).

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** 유효한 기존 게스트 세계를 찾아 이어서 쓴다. 없거나 만료됐으면 null. */
async function continueExistingWorld(
  sb: ReturnType<typeof getSupabaseServerClient>,
  guestToken: string
): Promise<{ worldId: string; episodeId: string } | null> {
  const guestTokenHash = sha256(guestToken);
  const { data: world } = await sb
    .from("worlds")
    .select("id, guest_expires_at")
    .eq("guest_token_hash", guestTokenHash)
    .maybeSingle();

  if (!world || !world.guest_expires_at || new Date(world.guest_expires_at).getTime() <= Date.now()) {
    return null;
  }

  // 48시간 창을 다시 늘려 둔다(매일 열 때마다 만료가 멀어짐).
  await sb
    .from("worlds")
    .update({ guest_expires_at: new Date(Date.now() + GUEST_TTL_MS).toISOString() })
    .eq("id", world.id);

  const { data: latest } = await sb
    .from("episodes")
    .select("id, episode_number, status")
    .eq("world_id", world.id)
    .order("episode_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return null; // 세계는 있는데 회차가 하나도 없는 비정상 상태 → 새로 만든다

  if (latest.status !== "completed") {
    // 아직 끝나지 않은 회차(예: 새로고침) → 그 회차를 그대로 이어간다.
    return { worldId: world.id, episodeId: latest.id };
  }

  // 지난 회차가 끝났으면 다음 회차를 만든다 (/api/episodes/[id]/next와 같은 규칙, 멱등).
  const nextNumber = latest.episode_number + 1;
  const { data: existingNext } = await sb
    .from("episodes")
    .select("id")
    .eq("world_id", world.id)
    .eq("episode_number", nextNumber)
    .maybeSingle();
  if (existingNext) return { worldId: world.id, episodeId: existingNext.id };

  const { data: next, error: nextErr } = await sb
    .from("episodes")
    .insert({ world_id: world.id, episode_number: nextNumber, status: "active" })
    .select("id")
    .single();
  if (nextErr || !next) {
    console.error("[sessions] next episode insert failed", nextErr);
    return null;
  }
  return { worldId: world.id, episodeId: next.id };
}

export async function POST(request: NextRequest) {
  const sb = getSupabaseServerClient();

  const existingToken = request.cookies.get(GUEST_COOKIE_NAME)?.value;
  if (existingToken) {
    const continued = await continueExistingWorld(sb, existingToken);
    if (continued) {
      const res = NextResponse.json({ ...continued, continued: true });
      // 같은 토큰을 다시 내려 만료 시각을 늘린다(값은 그대로, Max-Age만 갱신).
      res.cookies.set(GUEST_COOKIE_NAME, existingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GUEST_TTL_MS / 1000,
      });
      return res;
    }
    // 쿠키가 있었지만 세계를 못 찾았거나 만료됨 → 아래에서 새로 만든다.
  }

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

  const res = NextResponse.json({ worldId: world.id, episodeId: episode.id, continued: false });
  res.cookies.set(GUEST_COOKIE_NAME, guestToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_TTL_MS / 1000,
  });
  return res;
}
