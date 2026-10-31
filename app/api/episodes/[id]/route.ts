// GET /api/episodes/[id]?mode= — 회차 상세. 모드별 응답 분리(아이=동화책 텍스트만, 부모=리포트+원본). 소유: 역할 1.
// mode=parent: components/parent/parentData.ts의 fetchEpisodeDetail이 호출. 리포트·전사 포함.
// mode 생략(기본): components/kid/StoryBook.tsx가 호출. 동화책 텍스트만, 리포트·원본은 내려주지 않는다
//   (README §8 "모드별 응답 분리" — 아이 화면 API 응답엔 리포트가 절대 포함되지 않아야 함).
// TODO(역할 1): mode=parent는 부모 토큰(길게 누르기 관문)이 있을 때만 허용하도록 검증 추가.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const isParentMode = request.nextUrl.searchParams.get("mode") === "parent";

  if (!id) {
    return NextResponse.json({ error: "episodeId가 필요합니다." }, { status: 400 });
  }
  // mock-… 같은 id는 DB에 없다(uuid가 아니면 Postgres가 500을 낸다) → 404
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
  }

  const sb = getSupabaseServerClient();
  const { data: episode, error } = await sb
    .from("episodes")
    .select(
      "id, world_id, episode_number, status, started_at, title, island_title, storybook_text, report_json, next_teaser"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[episodes/[id]] lookup failed", error);
    return NextResponse.json({ error: "회차를 불러오지 못했습니다." }, { status: 500 });
  }
  if (!episode) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
  }

  const base = {
    id: episode.id,
    worldId: episode.world_id,
    episodeNumber: episode.episode_number,
    status: episode.status,
    startedAt: episode.started_at,
    title: episode.title,
    islandTitle: episode.island_title,
    storybookText: episode.storybook_text,
  };

  if (!isParentMode) {
    // 아이 모드: 동화책 텍스트까지만. 리포트·전사·마음 담기는 절대 포함하지 않는다.
    return NextResponse.json({ episode: base });
  }

  return NextResponse.json({
    episode: {
      ...base,
      report: episode.report_json,
      nextEpisodeTeaser: episode.next_teaser,
    },
  });
}
