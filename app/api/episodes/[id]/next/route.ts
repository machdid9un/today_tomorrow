// POST /api/episodes/[id]/next — 기억을 이어받은 다음 화 생성. 소유: 역할 1.
// [id]는 "방금 끝난 회차"의 episodeId. 같은 world_id로 episode_number+1 행을 만든다.
// 기억 자체(worldMemory)는 이미 /complete 때 worlds.memory_json에 저장돼 있고,
// /api/story/turn이 loadEpisodeContext(world_id)로 그 기억을 그대로 읽어오므로
// 여기서는 "다음 회차 행 생성"만 하면 된다 (기억을 복사하는 별도 로직 불필요).
import { NextResponse, type NextRequest } from "next/server";
import { canAccessWorld } from "@/lib/auth/worldAccess";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await context.params;
  if (!episodeId) {
    return NextResponse.json({ error: "episodeId가 필요합니다." }, { status: 400 });
  }
  if (episodeId.startsWith("mock")) {
    return NextResponse.json(
      { error: "mock episodeId는 DB가 없습니다. 테스트는 /api/story/selftest를 쓰세요." },
      { status: 400 }
    );
  }

  const sb = getSupabaseServerClient();

  const { data: current, error: currentErr } = await sb
    .from("episodes")
    .select("id, world_id, episode_number, status")
    .eq("id", episodeId)
    .single();

  if (currentErr || !current) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!current.world_id || !(await canAccessWorld(sb, request, current.world_id))) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
  }
  if (current.status !== "completed") {
    return NextResponse.json(
      { error: "아직 끝나지 않은 회차입니다. 먼저 /complete를 호출하세요." },
      { status: 409 }
    );
  }

  const nextNumber = current.episode_number + 1;

  // 이미 다음 회차가 만들어져 있으면 중복 생성하지 않고 그걸 그대로 돌려준다(멱등).
  const { data: existing } = await sb
    .from("episodes")
    .select("id")
    .eq("world_id", current.world_id)
    .eq("episode_number", nextNumber)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      worldId: current.world_id,
      episodeId: existing.id,
      episodeNumber: nextNumber,
      reused: true,
    });
  }

  const { data: next, error: nextErr } = await sb
    .from("episodes")
    .insert({
      world_id: current.world_id,
      episode_number: nextNumber,
      status: "active",
    })
    .select("id")
    .single();

  if (nextErr || !next) {
    console.error("[episodes/next] insert failed", nextErr);
    return NextResponse.json({ error: "다음 회차를 만들지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    worldId: current.world_id,
    episodeId: next.id,
    episodeNumber: nextNumber,
    reused: false,
  });
}
