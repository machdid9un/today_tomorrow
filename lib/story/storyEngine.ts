// 스토리 엔진: 턴 하나 생성. 소유: 역할 3.
// 종료 판정은 코드가 최종 결정하고, AI의 shouldEnd는 "제안"으로만 받는다 (README §4).
import type { EndReason, StoryTurnResult } from "@/types";
import type { EpisodeContext } from "./contextStore";
import { chatJSON, hasLlmKey, LlmJsonError, STORY_MODEL } from "./llm";
import { detectChildName } from "./memorySummarizer";
import { buildStoryMessages, CLOSING_LINE, OPENING_GUEST, type TurnMode } from "./prompts";
import { resolveSeedDirective } from "./seedPresets";

const SOFT_LIMIT_SEC = 5 * 60; // 이후 AI가 자연스러운 마무리 제안 가능
const HARD_LIMIT_SEC = 10 * 60; // 하드 타임아웃
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

/** TTS 큐용 문장 분할. "치익…" 같은 짧은 감탄도 한 문장으로 취급. */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const parts = normalized.match(/[^.!?…~。！？]+[.!?…~。！？]*["'”’)]*/g) ?? [normalized];
  return parts.map((s) => s.trim()).filter(Boolean);
}

const FALLBACK_QUESTION = "대장님은 어떻게 하고 싶어?";
const SENTENCE_END = /[.!?…~。！？]["'”’)]*$/;

/**
 * TTS용 내레이션 다듬기: 잘린 마지막 문장 제거, 최대 3문장, (진행 턴이면) 질문으로 끝나게.
 * 4문장 이상이면 앞 2문장 + 마지막 질문을 남긴다.
 */
export function trimNarration(text: string, isEnding: boolean): string {
  let parts = splitSentences(text);
  if (parts.length > 1 && !SENTENCE_END.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
  if (parts.length > 3) {
    const last = parts[parts.length - 1];
    parts = /\?["'”’)]*$/.test(last) ? [parts[0], parts[1], last] : parts.slice(0, 3);
  }
  if (!isEnding && !parts.some((s) => /\?["'”’)]*$/.test(s))) {
    parts = [...parts.slice(0, 2), FALLBACK_QUESTION];
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
  if (turnIndex > 0 && isSleepRequest(childText)) return "ending_sleep";
  if (forceEnd || elapsedSeconds >= HARD_LIMIT_SEC) return "ending_timeout";
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
    return { narration: "노란 용은 대장님 덕분에 다시 하늘을 날 수 있게 됐어.", choices: [] };
  }
  if (mode === "seed") {
    return {
      narration: "용이 날개를 다쳐서 천천히 걸어. 그런데 저 멀리 로켓이 떠나려고 해. 용 옆에 남을래, 로켓을 탈래?",
      choices: ["용 옆에 남기", "로켓 타기"],
    };
  }
  return {
    narration: `(${turnIndex}턴) 무전기에서 지직 소리가 났어. 저 멀리 노란 용이 손을 흔들고 있어. 용한테 뭐라고 말해 볼까?`,
    choices: ["인사하기", "숨어서 보기"],
    childName: turnIndex === 1 ? "지우" : null,
  };
}

export async function generateTurn(input: GenerateTurnInput): Promise<GeneratedTurn> {
  const { ctx, childText, turnIndex, elapsedSeconds } = input;
  const askName = turnIndex === 1 && !ctx.childName && ctx.episodeNumber <= 1;

  // 1) 게스트 1화 첫 멘트: 고정 문구, LLM 호출 없이 즉시
  if (turnIndex === 0 && !ctx.childName && ctx.episodeNumber <= 1) {
    return { narration: OPENING_GUEST, choices: [], shouldEnd: false, endingReason: null, childName: null };
  }

  // 2) 모드 결정 (코드가 판정)
  let mode = decideMode(input, Boolean(ctx.seedPreset));
  const seedDirective = mode === "seed" ? await resolveSeedDirective(ctx.seedPreset, ctx.seedText) : null;
  if (mode === "seed" && !seedDirective) mode = "normal";
  const canSuggestEnd = !input.short && mode === "normal" && elapsedSeconds >= SOFT_LIMIT_SEC;

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
        }),
        maxTokens: 600,
        temperature: 0.8,
        timeoutMs: 12000,
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
    typeof raw.narration === "string" ? trimNarration(raw.narration.trim(), shouldEnd) : "";
  if (!narration) throw new Error("EMPTY_NARRATION");

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
