// 스토리 엔진: 턴 하나 생성. 소유: 역할 3.
// 종료 판정은 코드가 최종 결정하고, AI의 shouldEnd는 "제안"으로만 받는다 (README §4).
import type { EndReason, StoryTurnResult } from "@/types";
import type { EpisodeContext } from "./contextStore";
import { chatJSON, hasLlmKey, LlmJsonError, STORY_MODEL } from "./llm";
import { detectChildName } from "./memorySummarizer";
import { toYongStyle, withTopic } from "./persona";
import { buildStoryMessages, CLOSING_LINE, OPENING_GUEST, WIND_DOWN_TURN, type TurnMode } from "./prompts";
import { isSafetyConcern } from "./safety";
import { plotPatternFor } from "./plotPatterns";
import { resolveSeedDirective, seedSceneHint } from "./seedPresets";
import { stageDirective, themeFor } from "./themes";

export { isSafetyConcern };

const HARD_LIMIT_SEC = 10 * 60; // 하드 타임아웃 (실제 경과 시간 기준 안전장치, 분량과는 별개)
// 분량(대장님과 주고받는 횟수) 기준: 7턴 미만이면 너무 빨리 끝나지 않게 마무리를 제안하지 않고,
// 15턴이 되면 길어도 그때는 반드시 마무리한다.
const MIN_TURNS_FOR_NATURAL_END = 7;
const MAX_TURNS = 15;
const SEED_TURN = 3; // 씨앗 장면 턴 (일반)
const SHORT_SEED_TURN = 2; // 씨앗 장면 턴 (?short=1)
const SHORT_LAST_TURN = 3; // ?short=1이면 이 턴에서 마무리

const SLEEP_PATTERN =
  /(잘래|잘게|잘\s?거야|잘\s?꺼야|졸려|졸리|자고\s?싶|잠\s?와|잠이\s?와|이제\s?자|그만\s?할래|그만\s?하고\s?싶|굿\s?나잇)/;

export interface GenerateTurnInput {
  ctx: EpisodeContext;
  childText: string;
  turnIndex: number;
  elapsedSeconds: number;
  forceEnd?: boolean;
  short?: boolean;
}

export interface GeneratedTurn extends StoryTurnResult {
  /** 이름 질문에 대한 답에서 뽑은 이름 (게스트 1화 turnIndex 1에서만) */
  childName: string | null;
}

interface RawTurn {
  narration?: unknown;
  choices?: unknown;
  shouldEnd?: unknown;
  childName?: unknown;
}

export function isSleepRequest(text: string): boolean {
  return SLEEP_PATTERN.test(text.replace(/\s+/g, " "));
}

/** TTS 큐용 문장 분할. "앗…" 같은 짧은 감탄도 한 문장으로 취급. */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const parts = normalized.match(/[^.!?…~。！？]+[.!?…~。！？]*["'”’)]*/g) ?? [normalized];
  return parts.map((s) => s.trim()).filter(Boolean);
}

const FALLBACK_QUESTION = "너는 어떻게 하고 싶어용?";
const SENTENCE_END = /[.!?…~。！？]["'”’)]*$/;

/**
 * TTS용 내레이션 다듬기: 잘린 마지막 문장 제거, 최대 maxSentences문장, (진행 턴이면) 질문으로 끝나게.
 * 넘치면 첫 문장 + 끝부분(질문 포함)을 남긴다.
 */
export function trimNarration(
  text: string,
  isEnding: boolean,
  fallbackQuestion = FALLBACK_QUESTION,
  maxSentences = 3
): string {
  let parts = splitSentences(text);
  if (parts.length > 1 && !SENTENCE_END.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
  // 질문 + 예시("누가 보냈을까요? 아기 용일까요, 아기 고래일까요?")는 한 덩어리로 지킨다
  const isQ = (s: string) => /\?["'”’)]*$/.test(s);
  const n = parts.length;
  if (maxSentences < 4 && n >= 4 && isQ(parts[n - 1]) && isQ(parts[n - 2])) {
    const body = parts.slice(0, -2);
    const keptBody = body.length > 2 ? [body[0], body[body.length - 1]] : body;
    return [...keptBody, ...parts.slice(-2)].join(" ");
  }
  if (maxSentences >= 4 && parts.length > maxSentences) {
    // 첫 문장(아이 말의 결과)과 끝부분(장면 → 질문)을 지킨다. 질문 바로 앞 장면이 빠지면 질문이 뜬금없어진다.
    // 안전 응답이면 '어른에게 말하기' 문장도 지킨다.
    const adult = parts.findIndex((x, i) => i >= 1 && i < parts.length - 2 && /(어른|선생님)/.test(x));
    parts =
      adult >= 0
        ? [parts[0], parts[adult], ...parts.slice(-(maxSentences - 2))]
        : [parts[0], ...parts.slice(-(maxSentences - 1))];
  } else if (maxSentences < 4 && parts.length > 3) {
    const last = parts[parts.length - 1];
    // 마지막 질문이 바로 앞 문장을 가리키는 경우가 많아(예: "그건 무엇일까요?") 첫 문장 + 마지막 두 문장을 남긴다
    parts = /\?["'”’)]*$/.test(last) ? [parts[0], ...parts.slice(-2)] : parts.slice(0, 3);
  }
  if (!isEnding && !parts.some((s) => /\?["'”’)]*$/.test(s))) {
    parts = [...parts.slice(0, 2), fallbackQuestion];
  }
  return parts.join(" ");
}

/** JSON이 깨졌거나(따옴표·잘림) 일부만 온 응답에서 narration·choices·childName을 살린다. */
export function salvageTurn(raw: string): RawTurn | null {
  const key = raw.search(/"narration"\s*:\s*"/);
  if (key === -1) return null;
  const start = raw.indexOf('"', raw.indexOf(":", key)) + 1;
  const choicesAt = raw.indexOf('"choices"', start);
  let narration = (choicesAt === -1 ? raw.slice(start) : raw.slice(start, choicesAt))
    .replace(/"\s*,?\s*$/, "")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, "'")
    .replace(/"/g, "'")
    .trim();
  if (!narration) return null;

  const choicesMatch = raw.match(/"choices"\s*:\s*\[([^\]]*)\]/);
  const choices = choicesMatch
    ? (choicesMatch[1].match(/"((?:[^"\\]|\\.)*)"/g) ?? []).map((s) => s.slice(1, -1))
    : [];
  const nameMatch = raw.match(/"childName"\s*:\s*"([^"]{1,12})"/);
  narration = narration.replace(/\s+/g, " ");
  return { narration, choices, childName: nameMatch?.[1] ?? null };
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.replace(/(대장님?|이에요|예요|이야|야|입니다)$/g, "").trim();
  return /^[가-힣A-Za-z]{1,8}$/.test(name) ? name : null;
}

function decideMode(input: GenerateTurnInput, hasSeed: boolean): TurnMode {
  const { childText, turnIndex, elapsedSeconds, forceEnd, short } = input;
  if (turnIndex > 0 && isSafetyConcern(childText)) return "safety"; // 잘래보다 먼저: 위험 신호는 꼭 받아 준다
  if (turnIndex > 0 && isSleepRequest(childText)) return "ending_sleep";
  if (forceEnd || elapsedSeconds >= HARD_LIMIT_SEC) return "ending_timeout";
  if (!short && turnIndex >= MAX_TURNS) return "ending_natural"; // 분량 상한: 15턴이면 무조건 마무리
  if (short && turnIndex >= SHORT_LAST_TURN) return "ending_natural";
  if (hasSeed && turnIndex === (short ? SHORT_SEED_TURN : SEED_TURN)) return "seed";
  return "normal";
}

function endingReasonFor(mode: TurnMode): EndReason | null {
  if (mode === "ending_sleep") return "sleep_request";
  if (mode === "ending_timeout") return "timeout";
  if (mode === "ending_natural") return "natural";
  return null;
}

/** 키가 없을 때(로컬 개발) 쓰는 가짜 턴. 계약 형태는 실제와 동일. */
function mockTurn(mode: TurnMode, turnIndex: number): RawTurn {
  if (mode.startsWith("ending")) {
    return { narration: "색깔 친구는 친구 덕분에 다시 반짝일 수 있게 됐어용.", choices: [] };
  }
  if (mode === "seed") {
    return {
      narration: "까꿍, 빨강 친구가 어딘가에 숨었어용. 사과 나무 뒤일까용, 아니면 노을 언덕일까용?",
      choices: ["사과 나무", "노을 언덕"],
    };
  }
  return {
    narration: `(${turnIndex}턴) 사르륵, 흐릿한 빛이 깜빡여용. 저 멀리 무지개 새가 날개를 흔들고 있어용. 무지개 새한테 뭐라고 말해 볼까용?`,
    choices: ["안녕 할래", "숨어서 볼래"],
    childName: turnIndex === 1 ? "지우" : null,
  };
}

export async function generateTurn(input: GenerateTurnInput): Promise<GeneratedTurn> {
  const { ctx, childText, turnIndex } = input;
  const askName = turnIndex === 1 && !ctx.childName && ctx.episodeNumber <= 1;

  // 1) 게스트 1화 첫 멘트: 고정 문구, LLM 호출 없이 즉시
  if (turnIndex === 0 && !ctx.childName && ctx.episodeNumber <= 1) {
    return { narration: OPENING_GUEST, choices: [], shouldEnd: false, endingReason: null, childName: null };
  }

  // 2) 모드 결정 (코드가 판정).
  // 갈림길 장면 = 오늘의 별 시즌 단계(예: 숨은 무지개의 오늘 찾을 색). 부모 씨앗이 있으면 그 '마음 주제'를 이 별 장면에 녹인다.
  // 시즌을 다 끝낸 별이면 회차별 고전 동화 뼈대를 이 별에 맞게 쓴다.
  const theme = themeFor(ctx.episodeId, ctx.themeId);
  const planetProgress = ctx.planets[theme.id] ?? null;
  const arc = stageDirective(theme, planetProgress, plotPatternFor(ctx.episodeId));
  // 부모가 고른 '마음 담기'(용의 태도)는 회차 내내 깔리고, 갈림길 장면에는 한 줄 힌트로 얹힌다
  const seedTone = ctx.seedPreset ? await resolveSeedDirective(ctx.seedPreset, ctx.seedText) : null;
  let mode = decideMode(input, true);
  let seedDirective: string | null = null;
  if (mode === "seed") {
    const hint = seedSceneHint(ctx.seedPreset);
    seedDirective = hint ? `${arc.directive}\n오늘의 마음 담기: ${hint}` : arc.directive;
  }
  if (mode === "seed" && !seedDirective) mode = "normal";
  const canSuggestEnd =
    !input.short && mode === "normal" && turnIndex >= MIN_TURNS_FOR_NATURAL_END;

  // 3) LLM 호출 (키 없으면 mock). JSON이 깨져도 살릴 수 있는 부분은 살린다.
  let raw: RawTurn;
  if (!hasLlmKey()) {
    raw = mockTurn(mode, turnIndex);
  } else {
    try {
      raw = await chatJSON<RawTurn>({
        model: STORY_MODEL,
        messages: buildStoryMessages({
          childName: ctx.childName,
          childAge: ctx.childAge,
          episodeNumber: ctx.episodeNumber,
          memory: ctx.memory,
          history: ctx.history,
          childText,
          turnIndex,
          mode,
          canSuggestEnd,
          seedDirective,
          askName,
          short: input.short,
          afterSeed: turnIndex === (input.short ? SHORT_SEED_TURN : SEED_TURN) + 1,
          episodeKey: ctx.episodeId,
          // 갈림길 바로 다음 턴에만: 오늘의 별 시즌 단계의 해결 방향 (부모 씨앗이 있어도 오늘의 목표는 풀리게).
          // 주의: 턴마다 매번 같은 resolve 문구를 다시 주면, 모델이 "아직 안 풀렸다"로 오해하고
          // 이미 끝난 장면(예: "징검돌이 놓였다")을 매 턴 또 narration으로 반복해 이야기가 헛돈다.
          // 한 번만 주고, 그 뒤는 대화 기록 + questionPlan(afterSeed/WIND_DOWN 등)이 자연스럽게 이어가게 한다.
          // (갱신) 갈림길 다음 턴은 '첫 시도의 뜻밖의 결과(arcTwist)' 차례라, 해결 방향은 해결하는 턴에 한 번만 준다:
          // 일반 회차 8턴(WIND_DOWN_TURN) 또는 마무리 턴(자연·시간 종료). 리드 수정 취지(매 턴 반복 주입 금지)는 그대로.
          plotResolve:
            turnIndex === (input.short ? SHORT_LAST_TURN : WIND_DOWN_TURN) || mode === "ending_natural" || mode === "ending_timeout"
              ? arc.resolve
              : undefined,
          themeId: theme.id,
          planetProgress,
          arcGoal: arc.goal,
          arcHook: arc.hook,
          arcTwist: arc.twist,
          seedTone,
          restMode: ctx.seedPreset === "rest",
        }),
        maxTokens: 600,
        temperature: 0.8,
        timeoutMs: 12000,
        thinking: false, // 실시간 대화: 추론을 끄고 빠르게
        hedgeAfterMs: 2500, // 2.5초 안에 답이 없으면 같은 요청을 하나 더 보내 먼저 온 답을 씀
      });
    } catch (err) {
      const salvaged = err instanceof LlmJsonError ? salvageTurn(err.raw) : null;
      if (!salvaged) throw err;
      console.warn(`[story] salvaged broken JSON (${(err as LlmJsonError).message})`);
      raw = salvaged;
    }
  }

  // 4) 검증·정리 (종료 여부를 먼저 정하고, 그에 맞게 내레이션을 다듬는다)
  let shouldEnd = false;
  let endingReason: EndReason | null = endingReasonFor(mode);
  if (endingReason) {
    shouldEnd = true;
  } else if (canSuggestEnd && raw.shouldEnd === true) {
    shouldEnd = true;
    endingReason = "natural";
  }

  let narration =
    typeof raw.narration === "string"
      ? trimNarration(
          raw.narration.trim(),
          shouldEnd,
          askName
            ? "누가 도와 달라고 했을까용?"
            : /이름/.test(raw.narration) // 이름 짓기 턴인데 질문이 빠진 경우
              ? "이 친구 이름을 뭐라고 지어 줄까용?"
              : `${withTopic(ctx.childName)} 어떻게 하고 싶어용?`,
          // 안전 응답('어른에게 말하기')과 갈림길 장면(받아 주기 + 장면 설명 + 질문)은 잘리지 않게 4문장까지
          mode === "safety" || mode === "seed" ? 5 : 4
        )
      : "";
  if (!narration) throw new Error("EMPTY_NARRATION");
  // 위험 신호 응답에는 '네 잘못이 아니야'와 '믿을 수 있는 어른에게 말하기'가 꼭 들어가야 한다 (빠지면 코드가 넣는다)
  if (mode === "safety") {
    const parts = splitSentences(narration);
    const missing: string[] = [];
    if (!/잘못이\s*아니/.test(narration)) missing.push(`그건 ${ctx.childName ? `${ctx.childName} ` : "네 "}잘못이 아니에용.`);
    if (!/(어른|선생님)/.test(narration)) missing.push("선생님이나 가까운 어른에게 꼭 이야기해 줘용.");
    if (missing.length) {
      parts.splice(Math.min(1, parts.length), 0, ...missing);
      narration = parts.join(" ");
    }
  }
  // 이야기 용 말투: 문장 끝 '요' → '용' (모델이 빠뜨려도 코드가 맞춘다. 다른 인물의 따옴표 대사는 그대로)
  narration = toYongStyle(narration);

  let choices = Array.isArray(raw.choices)
    ? raw.choices
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 20))
        .slice(0, 2)
    : [];

  if (shouldEnd) {
    choices = [];
    if (!narration.includes(CLOSING_LINE)) narration = `${narration} ${CLOSING_LINE}`;
  }

  return {
    narration,
    choices,
    shouldEnd,
    endingReason,
    // AI가 이름을 못 돌려줘도(잘린 JSON 등) 코드로 아이 답에서 이름을 찾는다
    childName: askName ? cleanName(raw.childName) ?? detectChildName(childText) : null,
  };
}
