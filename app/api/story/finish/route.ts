// POST /api/story/finish — 개발·테스트용. 소유: 역할 3.
// 회차를 끝냈다고 보고 관찰 노트 + 기억 요약·동화책을 생성해 JSON으로 돌려준다. DB에는 저장하지 않는다.
// - episodeId가 "mock"으로 시작하면(메모리 모드) 결과 기억이 다음 회차로 이어진다: mock-real1 → mock-real2
// - 실제 회차 종료·저장은 역할 1의 /api/episodes/[id]/complete가 lib/story/finalizeEpisode를 호출해 처리한다.
// 요청: { episodeId, endReason? }   endReason: natural | sleep_request | silence | timeout | manual
import type { EndReason } from "@/types";
import { finalizeEpisode } from "@/lib/story/finalizeEpisode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const END_REASONS: EndReason[] = ["natural", "sleep_request", "silence", "timeout", "manual"];

export async function POST(request: Request) {
  // 운영 배포에서는 부모 토큰 없이 리포트가 나가면 안 되므로 mock 회차만 허용
  const body = (await request.json().catch(() => null)) as
    | { episodeId?: unknown; endReason?: unknown }
    | null;
  const episodeId = typeof body?.episodeId === "string" ? body.episodeId.trim() : "";
  if (!episodeId) {
    return Response.json({ error: "episodeId가 필요합니다." }, { status: 400 });
  }
  if (!episodeId.startsWith("mock")) {
    return Response.json(
      { error: "테스트 전용 경로입니다. mock으로 시작하는 episodeId만 허용합니다." },
      { status: 403 }
    );
  }
  const endReason =
    typeof body?.endReason === "string" && (END_REASONS as string[]).includes(body.endReason)
      ? (body.endReason as EndReason)
      : null;

  const t0 = Date.now();
  const result = await finalizeEpisode(episodeId, endReason);
  console.log(`[story/finish] ep=${episodeId} ${Date.now() - t0}ms errors=${result.errors.length}`);
  return Response.json(result, { status: result.errors.length === 2 ? 502 : 200 });
}
