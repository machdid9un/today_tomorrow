// GET /api/episodes?worldId=&mode= — 회차 목록 (섬/별 리스트 + 부모 화면 목록). 소유: 역할 1.
// mode=parent: report_json·storybook_text까지 포함(부모 화면용, components/parent/parentData.ts).
// mode 생략(기본, 아이 화면 components/kid/world.ts): id·episodeNumber·islandTitle·status만.
//   아이 화면에는 리포트·동화책 원문을 내려주지 않는다(README §8 "모드별 응답 분리").
// TODO(역할 1): 게스트 쿠키/로그인 세션으로 worldId 소유권 검사. 지금은 worldId만 알면 누구나 조회 가능.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const worldId = request.nextUrl.searchParams.get("worldId");
  const isParentMode = request.nextUrl.searchParams.get("mode") === "parent";

  if (!worldId) {
    return NextResponse.json({ error: "worldId가 필요합니다." }, { status: 400 });
  }
  if (!UUID_RE.test(worldId)) {
    return NextResponse.json({ error: "세계를 찾을 수 없습니다." }, { status: 404 });
  }

  const sb = getSupabaseServerClient();

  const { data: world, error: worldErr } = await sb
    .from("worlds")
    .select("id, child_name, child_age, next_seed_preset")
    .eq("id", worldId)
    .maybeSingle();

  if (worldErr) {
    console.error("[episodes] world lookup failed", worldErr);
    return NextResponse.json({ error: "세계를 불러오지 못했습니다." }, { status: 500 });
  }
  if (!world) {
    return NextResponse.json({ error: "세계를 찾을 수 없습니다." }, { status: 404 });
  }

  // select는 항상 전체 컬럼으로 고정한다(모드에 따라 문자열을 바꾸면 Supabase 타입 추론이
  // 리터럴을 못 읽어 에러가 난다). 모드별 필터링은 응답을 만들 때 한다.
  const { data: episodes, error: episodesErr } = await sb
    .from("episodes")
    .select("id, episode_number, status, started_at, title, island_title, storybook_text, report_json")
    .eq("world_id", worldId)
    .order("episode_number", { ascending: true });

  if (episodesErr) {
    console.error("[episodes] list failed", episodesErr);
    return NextResponse.json({ error: "회차 목록을 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    worldId: world.id,
    childName: world.child_name,
    childAge: world.child_age,
    nextSeedPreset: world.next_seed_preset,
    episodes: (episodes ?? []).map((e) => ({
      id: e.id,
      episodeNumber: e.episode_number,
      startedAt: e.started_at,
      title: e.title,
      islandTitle: e.island_title,
      status: e.status,
      ...(isParentMode
        ? { storybookText: e.storybook_text ?? null, report: e.report_json ?? null }
        : {}),
    })),
  });
}
