// 회차 종료 처리: 관찰 노트 + 기억 요약·동화책을 병렬 생성. 소유: 역할 3.
// 역할 1의 /api/episodes/[id]/complete가 이 함수를 호출하고, 결과를 DB에 저장한다.
//   worlds.memory_json  ← summary.worldMemory   (병합 완료본이므로 덮어쓰기)
//   worlds.child_name   ← summary.childName     (비어 있을 때만)
//   episodes.report_json ← report
//   episodes.next_teaser ← report.nextEpisodeTeaser
//   episodes.storybook_text / island_title / title ← summary.storybookText / islandTitle / episodeTitle
// 주의: 이미 completed인 회차에는 다시 호출하지 말 것(기억이 두 번 병합됨).
import type { EndReason } from "@/types";
import { loadEpisodeContext, saveMockWorld, type EpisodeContext } from "./contextStore";
import { summarizeEpisode, type SummarizeEpisodeResult } from "./memorySummarizer";
import { generateParentReport, type ParentReportOut } from "./reportGenerator";
import { SEED_PRESET_SCENE_DIRECTIVES } from "./seedPresets";

export interface FinalizeEpisodeResult {
  report: ParentReportOut | null;
  summary: SummarizeEpisodeResult | null;
  /** 실패한 생성기 이름과 사유. 턴 기록은 이미 저장돼 있으니 재시도 가능. */
  errors: { step: "report" | "summary"; message: string }[];
}

/** 이번 회차에 실제로 쓰였을 씨앗 설명 (노트는 부모만 보므로 자유 입력 원문도 괜찮음). */
function seedDirectiveFor(ctx: EpisodeContext): string | null {
  if (ctx.history.length < 3) return null; // 씨앗 장면 턴(일반 3, short 2)까지 못 갔으면 없음
  if (!ctx.seedPreset) return null;
  if (ctx.seedPreset === "custom") return ctx.seedText?.trim() || null;
  return SEED_PRESET_SCENE_DIRECTIVES[ctx.seedPreset] ?? null;
}

export async function finalizeEpisode(
  episodeId: string,
  endReason: EndReason | null = null
): Promise<FinalizeEpisodeResult> {
  const ctx = await loadEpisodeContext(episodeId);

  const [reportResult, summaryResult] = await Promise.allSettled([
    generateParentReport({
      turns: ctx.history,
      childName: ctx.childName,
      seedDirective: seedDirectiveFor(ctx),
      endReason,
    }),
    summarizeEpisode({
      turns: ctx.history,
      prevMemory: ctx.memory,
      childName: ctx.childName,
      episodeNumber: ctx.episodeNumber,
    }),
  ]);

  const errors: FinalizeEpisodeResult["errors"] = [];
  const report = reportResult.status === "fulfilled" ? reportResult.value : null;
  if (reportResult.status === "rejected") {
    errors.push({ step: "report", message: String(reportResult.reason) });
  }
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  if (summaryResult.status === "rejected") {
    errors.push({ step: "summary", message: String(summaryResult.reason) });
  }

  if (summary) saveMockWorld(ctx, summary); // 메모리 모드에서만 동작
  if (errors.length) console.error("[story/finalize]", episodeId, errors);

  return { report, summary, errors };
}
