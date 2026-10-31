// 회차 종료 처리: 관찰 노트 + 기억 요약·동화책을 병렬 생성. 소유: 역할 3.
// 역할 1의 /api/episodes/[id]/complete가 이 함수를 호출하고, 결과를 DB에 저장한다.
//   worlds.memory_json  ← summary.worldMemory   (병합 완료본이므로 덮어쓰기. 행성별 시즌 진행 planets 포함)
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
import { recommendSeeds } from "./seedRecommend";
import { plotPatternFor } from "./plotPatterns";
import {
  advancePlanet,
  isThemeId,
  progressCount,
  progressLine,
  stageDirective,
  themeFor,
  themeFromText,
  type PlanetProgress,
  type StoryTheme,
} from "./themes";

/** 결과 화면·부모 화면용 오늘의 별 진행 (report.planet, result.planet) */
export interface PlanetResult {
  id: StoryTheme["id"];
  planet: string;
  /** 이번 회차까지 반영한 진행 */
  progress: PlanetProgress;
  done: number;
  total: number;
  /** 다음 방문 안내 한 줄 (예: '지금까지 찾은 색 3/7: 빨강·주황·노랑. 남은 색: …') */
  line: string;
  /** 오늘 밤 목표 */
  goal: string;
}

export interface FinalizeEpisodeResult {
  report: ParentReportOut | null;
  /** true면 이번 회차에 씨앗 장면을 썼다 → worlds.next_seed_preset/next_seed_text를 비울 것 (역할 1) */
  seedConsumed: boolean;
  summary: SummarizeEpisodeResult | null;
  /** 실패한 생성기 이름과 사유. 턴 기록은 이미 저장돼 있으니 재시도 가능. */
  errors: { step: "report" | "summary"; message: string }[];
  /** 오늘의 별과 시즌 진행 (summary.worldMemory.planets에도 들어가 있음) */
  planet: PlanetResult;
}

const SEED_TURN = 3;

/** 회차의 별: 턴 요청에서 받은 별 → 이야기 용이 말한 별 이름 → episodeId로 고정된 별 */
function episodeTheme(ctx: EpisodeContext, themeId?: string | null): StoryTheme {
  if (isThemeId(themeId)) return themeFor(ctx.episodeId, themeId);
  if (ctx.themeId) return themeFor(ctx.episodeId, ctx.themeId);
  const said = ctx.history.slice(0, 3).map((t) => t.narration).join(" ");
  return themeFromText(said) ?? themeFor(ctx.episodeId);
}

/** 이번 회차에 실제로 쓰였을 씨앗 설명 (노트는 부모만 보므로 자유 입력 원문도 괜찮음). */
function seedDirectiveFor(ctx: EpisodeContext): string | null {
  if (ctx.history.length < 3) return null; // 씨앗 장면 턴(일반 3, short 2)까지 못 갔으면 없음
  if (!ctx.seedPreset) return null;
  if (ctx.seedPreset === "custom") return ctx.seedText?.trim() || null;
  return SEED_PRESET_SCENE_DIRECTIVES[ctx.seedPreset] ?? null;
}

/** 씨앗 장면 턴까지 갔는가 (갔다면 씨앗을 '썼다'고 본다 → 역할 1 complete에서 next_seed_* 비우기 기준) */
export function seedUsed(ctx: EpisodeContext): boolean {
  return Boolean(ctx.seedPreset) && ctx.history.length >= 3;
}

export async function finalizeEpisode(
  episodeId: string,
  endReason: EndReason | null = null,
  /** 선택: 아이가 고른 별 (역할 1 complete가 알면 넘김. 없으면 회차 중 받은 값·대화에서 찾음) */
  themeId?: string | null
): Promise<FinalizeEpisodeResult> {
  const ctx = await loadEpisodeContext(episodeId);
  const theme = episodeTheme(ctx, themeId);
  const prevProgress = ctx.planets[theme.id] ?? null;
  const arc = stageDirective(theme, prevProgress, plotPatternFor(ctx.episodeId));

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
      planet: { theme, progress: prevProgress, goal: arc.goal, stageId: arc.stageId },
    }),
  ]);

  const errors: FinalizeEpisodeResult["errors"] = [];
  const report = reportResult.status === "fulfilled" ? reportResult.value : null;
  if (report) {
    // 결과 화면의 '다음 씨앗 추천' (아이 말 근거, 방금 쓴 씨앗 제외). report_json에 같이 저장된다.
    const nameIdx = ctx.history[0]?.narration.includes("이름") ? 1 : null;
    report.seedSuggestions = recommendSeeds(ctx.history, seedUsed(ctx) ? ctx.seedPreset : null, nameIdx);
  }
  if (reportResult.status === "rejected") {
    errors.push({ step: "report", message: String(reportResult.reason) });
  }
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  if (summaryResult.status === "rejected") {
    errors.push({ step: "summary", message: String(summaryResult.reason) });
  }

  // 시즌 진행: 갈림길 장면(3턴) 다음 턴까지 갔으면 한 단계 나아간다 (숨은 무지개는 색 하나)
  const reached = ctx.history.length >= SEED_TURN + 2;
  const nextProgress = advancePlanet(theme, prevProgress, {
    reached,
    foundColor: summary?.planetUpdate?.found ?? null,
    collected: summary?.planetUpdate?.made ?? [],
  });
  const planets = { ...ctx.planets, [theme.id]: nextProgress };
  const { done, total } = progressCount(theme, nextProgress);
  const planet: PlanetResult = {
    id: theme.id,
    planet: theme.planet,
    progress: nextProgress,
    done,
    total,
    line: progressLine(theme, nextProgress),
    goal: arc.goal,
  };
  if (summary) summary.worldMemory = { ...summary.worldMemory, planets } as typeof summary.worldMemory;
  if (report) report.planet = { id: planet.id, planet: planet.planet, done, total, goal: arc.goal, collected: nextProgress.collected.slice(-7) };

  if (summary) saveMockWorld(ctx, summary); // 메모리 모드에서만 동작
  if (errors.length) console.error("[story/finalize]", episodeId, errors);

  return { report, summary, errors, seedConsumed: seedUsed(ctx), planet };
}
