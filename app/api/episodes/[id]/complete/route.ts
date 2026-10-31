// POST /api/episodes/[id]/complete — 회차 종료, 역할 3 생성기 호출 → 리포트·기억·동화책 저장. 소유: 역할 1.
// 요청: { endReason? }  natural | sleep_request | silence | timeout | manual
// mock episodeId는 DB가 없으니 /api/story/finish(역할 3, 테스트 전용)를 쓴다.
import { NextResponse, type NextRequest } from "next/server";
import { canAccessWorld } from "@/lib/auth/worldAccess";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import { finalizeEpisode } from "@/lib/story/finalizeEpisode";
import type { EndReason } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const END_REASONS: EndReason[] = ["natural", "sleep_request", "silence", "timeout", "manual"];

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
      { error: "mock episodeId는 DB가 없습니다. 테스트는 /api/story/finish를 쓰세요." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as { endReason?: unknown } | null;
  const endReason =
    typeof body?.endReason === "string" && (END_REASONS as string[]).includes(body.endReason)
      ? (body.endReason as EndReason)
      : null;

  const sb = getSupabaseServerClient();

  const { data: episode, error: episodeErr } = await sb
    .from("episodes")
    .select("id, world_id, status")
    .eq("id", episodeId)
    .single();

  if (episodeErr || !episode) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!episode.world_id || !(await canAccessWorld(sb, request, episode.world_id))) {
    return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 끝난 회차는 다시 병합하지 않는다 (finalizeEpisode 주석: 기억이 두 번 합쳐짐 방지).
  if (episode.status === "completed") {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  const t0 = Date.now();
  const { report, summary, errors, seedConsumed } = await finalizeEpisode(episodeId, endReason);

  // 턴 기록 저장이 우선이라는 원칙(README §13-6): report/summary가 비어도 회차는 종료 처리한다.
  const episodeUpdate: Record<string, unknown> = {
    status: "completed",
    ended_at: new Date().toISOString(),
    end_reason: endReason,
  };
  if (report) {
    episodeUpdate.report_json = report;
    episodeUpdate.next_teaser = report.nextEpisodeTeaser;
  }
  if (summary) {
    episodeUpdate.storybook_text = summary.storybookText;
    episodeUpdate.island_title = summary.islandTitle;
    episodeUpdate.title = summary.episodeTitle;
  }

  const { error: updateEpisodeErr } = await sb
    .from("episodes")
    .update(episodeUpdate)
    .eq("id", episodeId);
  if (updateEpisodeErr) console.error("[episodes/complete] episode update failed", updateEpisodeErr);

  if (summary && episode.world_id) {
    const worldUpdate: Record<string, unknown> = { memory_json: summary.worldMemory };
    // 부모가 담은 마음(씨앗)을 이번 회차에 썼으면 비운다 — 안 비우면 다음 회차에도 같은 마음이 또 들어간다
    if (seedConsumed) {
      worldUpdate.next_seed_preset = null;
      worldUpdate.next_seed_text = null;
    }
    if (summary.childName) {
      const { data: world } = await sb
        .from("worlds")
        .select("child_name")
        .eq("id", episode.world_id)
        .single();
      if (!world?.child_name) worldUpdate.child_name = summary.childName;
    }
    const { error: updateWorldErr } = await sb
      .from("worlds")
      .update(worldUpdate)
      .eq("id", episode.world_id);
    if (updateWorldErr) console.error("[episodes/complete] world update failed", updateWorldErr);
  }

  console.log(`[episodes/complete] ep=${episodeId} ${Date.now() - t0}ms errors=${errors.length}`);

  return NextResponse.json({ ok: true, report, summary, errors });
}
