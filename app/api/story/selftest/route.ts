// GET /api/story/selftest — AI 엔진 자가 테스트 (역할 3 전용). 소유: 역할 3.
// 서버 안에서 1화(여러 턴) → 회차 종료(노트·기억·동화책) → 2화 첫 턴을 실제 LLM으로 돌리고 결과를 JSON으로 준다.
// 로컬 개발 서버(npm run dev) 또는 STORY_SELFTEST=1 인 배포에서만 동작한다. 팀 배포본(운영)에서는 404.
//
// 쿼리(모두 선택):
//   lines=지우야|용한테 가볼래|...   아이 발화 목록 ("|" 구분, turnIndex 1부터 차례로)
//   seed=friend|school|sibling|fear|new_place|none   씨앗 프리셋 (기본 friend)
//   short=1   심사용 짧은 회차(3턴)
//   ep2=0     2화 첫 턴 생략
//   extra={"..."}  (개발 서버 전용 실험) LLM 요청 본문에 덧붙일 JSON. 예: 추론 끄기 옵션 시험
import type { SeedPreset } from "@/types";
import { loadEpisodeContext, saveTurn } from "@/lib/story/contextStore";
import { finalizeEpisode } from "@/lib/story/finalizeEpisode";
import { drainLlmStats, REPORT_MODEL, setLlmExtraBody, STORY_MODEL } from "@/lib/story/llm";
import { generateTurn, splitSentences } from "@/lib/story/storyEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_LINES = ["지우야", "용한테 가볼래", "용이 아파 보여", "용 옆에 남을래", "나 이제 졸려"];
const SEEDS: (SeedPreset | "none")[] = ["friend", "school", "sibling", "fear", "new_place", "none"];

function randomTag(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

export async function GET(request: Request) {
  const enabled = process.env.NODE_ENV === "development" || process.env.STORY_SELFTEST === "1";
  if (!enabled) {
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const lines = (url.searchParams.get("lines") ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 15);
  const childLines = lines.length ? lines : DEFAULT_LINES;
  const seedParam = url.searchParams.get("seed") ?? "friend";
  const seed = (SEEDS as string[]).includes(seedParam) ? (seedParam as SeedPreset | "none") : "friend";
  const short = url.searchParams.get("short") === "1";
  const runEp2 = url.searchParams.get("ep2") !== "0";

  // 메모리 모드 회차 ID: 끝 숫자만 다르면 같은 가짜 세계를 공유 (mock-xxxx-1 → mock-xxxx-2)
  // 실험용 요청 본문 덧붙이기 (이 요청 동안만)
  let extra: Record<string, unknown> | null = null;
  const extraParam = url.searchParams.get("extra");
  if (extraParam) {
    try {
      extra = JSON.parse(extraParam) as Record<string, unknown>;
    } catch {
      return Response.json({ ok: false, error: "extra는 JSON이어야 합니다." }, { status: 400 });
    }
  }
  setLlmExtraBody(extra);
  drainLlmStats();

  const tag = randomTag();
  const ep1 = `mock-${tag}-1`;
  const ep2 = `mock-${tag}-2`;

  const started = Date.now();
  const turns: unknown[] = [];

  try {
    const ctx = await loadEpisodeContext(ep1);
    ctx.seedPreset = seed === "none" ? null : seed;

    let endReason = null as Awaited<ReturnType<typeof generateTurn>>["endingReason"];
    for (let turnIndex = 0; turnIndex <= childLines.length; turnIndex++) {
      const childText = turnIndex === 0 ? "" : childLines[turnIndex - 1];
      const t0 = Date.now();
      const elapsedSeconds = Math.floor((Date.now() - ctx.startedAt) / 1000);
      const turn = await generateTurn({ ctx, childText, turnIndex, elapsedSeconds, short });
      await saveTurn(ctx, {
        turnIndex,
        childText,
        narration: turn.narration,
        choices: turn.choices,
        prevLatencyMs: null,
        childName: turn.childName,
      });
      turns.push({
        turnIndex,
        childText,
        sentences: splitSentences(turn.narration),
        choices: turn.choices,
        shouldEnd: turn.shouldEnd,
        endingReason: turn.endingReason,
        childName: turn.childName,
        ms: Date.now() - t0,
        llm: drainLlmStats(),
      });
      if (turn.shouldEnd) {
        endReason = turn.endingReason;
        break;
      }
    }

    const f0 = Date.now();
    const finish = await finalizeEpisode(ep1, endReason);
    const finishMs = Date.now() - f0;
    const finishLlm = drainLlmStats();

    let episode2: unknown = null;
    if (runEp2) {
      const ctx2 = await loadEpisodeContext(ep2);
      const t0 = Date.now();
      const turn = await generateTurn({ ctx: ctx2, childText: "", turnIndex: 0, elapsedSeconds: 0 });
      episode2 = {
        knownName: ctx2.childName,
        memoryInjected: ctx2.memory,
        sentences: splitSentences(turn.narration),
        choices: turn.choices,
        ms: Date.now() - t0,
        llm: drainLlmStats(),
      };
    }

    setLlmExtraBody(null);
    return Response.json({
      ok: true,
      models: { story: STORY_MODEL, report: REPORT_MODEL },
      config: { seed, short, lines: childLines, extra },
      turns,
      finish: { ms: finishMs, llm: finishLlm, ...finish },
      episode2,
      totalMs: Date.now() - started,
    });
  } catch (err) {
    setLlmExtraBody(null);
    return Response.json(
      { ok: false, error: String(err), turns, totalMs: Date.now() - started },
      { status: 500 }
    );
  }
}
