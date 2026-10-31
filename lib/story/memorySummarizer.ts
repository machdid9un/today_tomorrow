// 종료 후 기억 요약 + 동화책 다듬기 + 제목 생성. 소유: 역할 3.
// 순수 함수: DB를 직접 읽거나 쓰지 않는다. 호출자(/api/episodes/[id]/complete)가 턴·지난 기억을 넘기고,
// 결과를 worlds.memory_json / worlds.child_name / episodes.storybook_text / island_title / title 에 저장한다.
// LLM 호출은 회차당 1번(REPORT_MODEL). 키가 없으면 결정적 mock, 아이 발화가 0개면 LLM 없이 기본 결과.
import type { StoryMemory } from "@/types";
import type { TurnRecord } from "./contextStore";
import { chatJSON, hasLlmKey, REPORT_MODEL, type ChatMessage } from "./llm";
import { CLOSING_LINE } from "./prompts";

export interface SummarizeEpisodeInput {
  turns: TurnRecord[];
  /** 지난 회차까지 누적된 기억 (worlds.memory_json). 첫 회차면 null. */
  prevMemory: StoryMemory | null;
  childName: string | null;
  episodeNumber: number;
}

export interface SummarizeEpisodeResult {
  /** 지난 기억 + 이번 회차를 합친 기억. worlds.memory_json에 그대로 저장. */
  worldMemory: StoryMemory;
  storybookText: string;
  islandTitle: string;
  episodeTitle: string;
  /** 알고 있는 이름(입력값 또는 1턴 답에서 찾은 이름). worlds.child_name용. */
  childName: string | null;
}

const MAX_NAMED = 6; // characters / items / places 각각
const MAX_EVENTS = 5; // keyEvents: 최근 것 유지
const MAX_NEW_EVENTS = 3; // 한 회차에서 새로 더하는 사건 수
const NAMED_ENTRY_MAX = 30;
const EVENT_ENTRY_MAX = 80;
const HOOK_MAX = 100;
const ISLAND_TITLE_MIN = 2;
const ISLAND_TITLE_MAX = 8;
const EPISODE_TITLE_MAX = 20;
const TRANSCRIPT_MAX_TURNS = 60;
const TRANSCRIPT_LINE_MAX = 300;

const QUIET_ISLAND_TITLE = "조용한 섬";
const QUIET_EPISODE_TITLE = "조용한 밤의 무전";

type NamedKey = "characters" | "items" | "places";
const MEMORY_KEYS = ["characters", "items", "places", "keyEvents", "nextHook"] as const;

// ───────────────────────── 텍스트 도우미 ─────────────────────────

function charLength(s: string): number {
  return Array.from(s).length;
}

function clip(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : chars.slice(0, max).join("").trim();
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function textOf(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

const SIGN_OFF_PATTERN = /오늘\s*무전은\s*여기까지[.!…~]*\s*(?:내일\s*또\s*만나[.!…~]*)?/g;

/** 무전기 종료 멘트(CLOSING_LINE) 제거 */
function removeSignOff(text: string): string {
  return text.split(CLOSING_LINE).join(" ").replace(SIGN_OFF_PATTERN, " ");
}

function splitSentences(text: string): string[] {
  const normalized = collapse(text);
  if (!normalized) return [];
  const parts = normalized.match(/[^.!?…~]+[.!?…~]*["'”’)]*/g) ?? [normalized];
  return parts.map((s) => s.trim()).filter(Boolean);
}

/** 듣는 사람에게 묻는 질문(따옴표 안 대사는 제외) */
function isListenerQuestion(sentence: string): boolean {
  return /[?？][!]*$/.test(sentence.trim());
}

/** 내레이션에서 종료 멘트·선택 질문을 뺀 문장들 */
function storySentences(narration: string): string[] {
  return splitSentences(removeSignOff(narration)).filter((s) => !isListenerQuestion(s));
}

// ───────────────────────── 개인정보 필터 ─────────────────────────

/** 현실 개인정보로 보이는 기억 항목은 저장하지 않는다 (학교·주소·연락처·가족/친구 다툼). */
const REAL_WORLD_PATTERN =
  /(학교|유치원|어린이집|학원|아파트|주소|전화|연락처|번호|@|\d{3,}|[가-힣]+(동|로|길)\s?\d)/;
const FAMILY_CONFLICT_PATTERN =
  /(엄마|아빠|부모|누나|언니|오빠|동생|할머니|할아버지|친구|(^|\s)형).{0,10}(싸우|싸웠|싸움|혼나|혼났|혼내|때리|때렸|맞았|미워|화나|화났|화내|울었|괴롭)/;

function isRealWorldInfo(s: string): boolean {
  return REAL_WORLD_PATTERN.test(s) || FAMILY_CONFLICT_PATTERN.test(s);
}

// ───────────────────────── 기억 정리·병합 ─────────────────────────

function emptyMemory(): StoryMemory {
  return { characters: [], items: [], places: [], keyEvents: [], nextHook: "" };
}

function entryText(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (isRecord(v)) {
    for (const key of ["name", "title", "text", "event", "value"]) {
      if (typeof v[key] === "string") return v[key] as string;
    }
  }
  return null;
}

/** LLM/DB 값 → 정리된 문자열 목록(개인정보 항목 제외). 배열·문자열이 아니면 null. */
function toEntries(v: unknown, maxLen: number, splitString: boolean): string[] | null {
  let list: unknown[];
  if (Array.isArray(v)) list = v;
  else if (typeof v === "string" && v.trim()) list = splitString ? v.split(/[,、\n]/) : [v];
  else return null;

  const out: string[] = [];
  for (const item of list) {
    const raw = entryText(item);
    if (!raw) continue;
    const s = collapse(raw.replace(/^\s*(?:[-*•]\s*|\d+[.)]\s+)/, ""));
    if (!s || isRealWorldInfo(s)) continue;
    out.push(clip(s, maxLen));
  }
  return out;
}

function sameKey(s: string): string {
  return s.toLowerCase().replace(/[\s.,!?~…"'“”‘’()[\]{}<>·:;\-]/g, "");
}

/** 같은 대상인가: 정규화 후 같거나, 둘 다 2글자 이상이고 한쪽이 다른 쪽을 포함 ("노랑이" ~ "노랑이(노란 용)") */
function isSameThing(a: string, b: string): boolean {
  const ka = sameKey(a);
  const kb = sameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  return ka.length >= 2 && kb.length >= 2 && (ka.includes(kb) || kb.includes(ka));
}

/** 앞 목록 우선으로 합치고 중복 제거, 앞에서부터 max개 */
function mergeNamed(primary: string[], secondary: string[], max: number): string[] {
  const out: string[] = [];
  for (const s of [...primary, ...secondary]) {
    if (!sameKey(s)) continue;
    if (!out.some((o) => isSameThing(o, s))) out.push(s);
  }
  return out.slice(0, max);
}

/** 시간순(오래된 것 → 최근)으로 합치고 같은 문장은 한 번만, 최근 max개 유지 */
function mergeEvents(older: string[], newer: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...older, ...newer]) {
    const k = sameKey(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.slice(-max);
}

function cleanHook(v: unknown): string | null {
  const s = collapse(textOf(v));
  if (!s || isRealWorldInfo(s)) return null;
  return clip(s, HOOK_MAX);
}

/** 지난 기억(DB 값일 수 있음)을 안전한 StoryMemory로 */
function sanitizeMemory(raw: unknown): StoryMemory {
  if (!isRecord(raw)) return emptyMemory();
  const named = (key: NamedKey) =>
    mergeNamed(toEntries(raw[key], NAMED_ENTRY_MAX, true) ?? [], [], MAX_NAMED);
  return {
    characters: named("characters"),
    items: named("items"),
    places: named("places"),
    keyEvents: mergeEvents(toEntries(raw.keyEvents, EVENT_ENTRY_MAX, false) ?? [], [], MAX_EVENTS),
    nextHook: cleanHook(raw.nextHook) ?? "",
  };
}

/**
 * 지난 기억 + 이번 회차(LLM 출력) 병합.
 * - characters/items/places: LLM 목록(중요한 순)을 앞에, 지난 기억을 뒤에 → 중복 제거 → 6개.
 *   LLM이 빠뜨려도 자리가 남으면 지난 기억이 유지된다. 필드가 없거나 깨지면 지난 기억 그대로.
 * - keyEvents: 지난 사건 뒤에 이번 회차 새 사건(최대 3개)을 붙이고 최근 5개 유지.
 * - nextHook: 새 값이 없으면 지난 값.
 */
function mergeWorldMemory(prev: StoryMemory, raw: Record<string, unknown> | null): StoryMemory {
  const r = raw ?? {};
  const named = (key: NamedKey) =>
    mergeNamed(toEntries(r[key], NAMED_ENTRY_MAX, true) ?? [], prev[key], MAX_NAMED);
  const fresh = (toEntries(r.keyEvents, EVENT_ENTRY_MAX, false) ?? []).slice(-MAX_NEW_EVENTS);
  return {
    characters: named("characters"),
    items: named("items"),
    places: named("places"),
    keyEvents: mergeEvents(prev.keyEvents, fresh, MAX_EVENTS),
    nextHook: cleanHook(r.nextHook) ?? prev.nextHook,
  };
}

function isEmptyMemory(m: StoryMemory): boolean {
  return (
    !m.characters.length && !m.items.length && !m.places.length && !m.keyEvents.length && !m.nextHook
  );
}

// ───────────────────────── 이름 찾기 (LLM 없이) ─────────────────────────

const NAME_REJECT_PATTERN = /(몰라|모르|몰루|비밀|싫어|싫은데|안\s?알려|안\s?할래|없어|글쎄)/;
const NAME_STOPWORDS = new Set([
  "응", "어", "아", "네", "예", "음", "엉", "웅", "나", "저", "너", "왜", "뭐", "누구",
  "아니", "아니야", "좋아", "그래", "안녕", "안녕하세요", "하이", "헬로", "여보세요",
  "대장", "대장님", "탐험대", "치익", "여기", "이름",
  "hi", "hello", "yes", "no", "ok", "okay",
]);
const NAME_PREFIXES: RegExp[] = [
  /^(?:음+|어+|아+|응+|엉+|웅+|네|예)\s+/,
  /^(?:내|제|나의|저의)\s?이름은\s*/,
  /^이름은\s*/,
  /^(?:나는|저는)\s*/,
  /^(?:난|전|나|저)\s+/,
];

interface SuffixRule {
  re: RegExp;
  afterBatchim?: boolean; // 앞 글자에 받침이 있을 때만 ("민준이에요" O, "서이야" → "서이")
  minRest?: number;
}
const NAME_SUFFIXES: SuffixRule[] = [
  { re: /\s*이라고\s?(?:합니다|해요|해|불러줘|불러)$/, afterBatchim: true },
  { re: /\s*라고\s?(?:합니다|해요|해|불러줘|불러)$/ },
  { re: /\s*입니다$/ },
  { re: /\s*이에요$/, afterBatchim: true },
  { re: /\s*예요$/ },
  { re: /\s*이요$/, afterBatchim: true },
  { re: /\s*이야$/, afterBatchim: true },
  { re: /\s*야$/ },
  { re: /\s*요$/ },
  { re: /\s*대장님?$/ },
  { re: /이$/, afterBatchim: true, minRest: 2 }, // "민준이" → "민준"
];

function endsWithBatchim(s: string): boolean {
  const last = Array.from(s).pop();
  if (!last) return false;
  const code = last.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/** "지우야" → "지우", "저는 민준이에요" → "민준", "몰라" → null. 한글/영문 1~8자만 인정. */
export function detectChildName(text: string | null | undefined): string | null {
  if (!text) return null;
  let s = collapse(text.normalize("NFC").replace(/[.,!?~…"'“”‘’()[\]{}<>:;·\-_/]/g, " "));
  if (!s || NAME_REJECT_PATTERN.test(s)) return null;

  for (const re of NAME_PREFIXES) s = s.replace(re, "").trim();

  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const rule of NAME_SUFFIXES) {
      const m = rule.re.exec(s);
      if (!m) continue;
      const rest = s.slice(0, m.index).trim();
      if (!rest) return null; // 전부 어미("대장님", "이야")뿐
      if (rule.afterBatchim && !endsWithBatchim(rest)) continue;
      if (rule.minRest && charLength(rest) < rule.minRest) continue;
      s = rest;
      changed = true;
      break;
    }
    if (!changed) break;
  }

  if (!/^[가-힣A-Za-z]{1,8}$/.test(s)) return null;
  if (NAME_STOPWORDS.has(s.toLowerCase())) return null;
  return s;
}

// ───────────────────────── 동화책·제목 정리 ─────────────────────────

function cleanStorybook(v: unknown): string | null {
  let text = "";
  if (typeof v === "string") text = v;
  else if (Array.isArray(v)) text = v.filter((x): x is string => typeof x === "string").join("\n\n");
  if (!text.trim()) return null;

  text = text
    .replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\*\*|__/g, "")
    .replace(/^[ \t]*#+[ \t]*/gm, "");

  // 문단 구분: 빈 줄이 있으면 빈 줄 기준, 없으면 줄 기준. 종료 멘트는 문단으로 나눈 뒤 지운다.
  const blocks = /\n[ \t]*\n/.test(text) ? text.split(/\n[ \t]*\n/) : text.split("\n");
  const paras = blocks.map((b) => collapse(removeSignOff(b))).filter(Boolean);

  // 끝에 붙은 "듣는 사람에게 묻는 질문" 제거 (따옴표 안 대사는 둔다)
  while (paras.length) {
    const sentences = splitSentences(paras[paras.length - 1]);
    let popped = false;
    while (sentences.length && isListenerQuestion(sentences[sentences.length - 1])) {
      sentences.pop();
      popped = true;
    }
    if (!popped) break;
    if (sentences.length) {
      paras[paras.length - 1] = sentences.join(" ");
      break;
    }
    paras.pop();
  }

  const joined = paras.join("\n\n");
  return charLength(joined.replace(/\s/g, "")) >= 20 ? joined : null;
}

/** LLM이 본문 맨 앞에 제목 줄을 넣었으면 뺀다 */
function dropTitleLine(storybook: string, titles: string[]): string | null {
  const paras = storybook.split("\n\n");
  const keys = titles.map(sameKey).filter(Boolean);
  if (paras.length > 1 && keys.includes(sameKey(paras[0]))) paras.shift();
  const joined = paras.join("\n\n");
  return joined.trim() ? joined : null;
}

const TITLE_STRIP = /["'“”‘’「」『』《》〈〉<>[\]*#]/g;

function cleanIslandTitle(v: unknown): string | null {
  const t = collapse(textOf(v).replace(TITLE_STRIP, ""));
  if (!t) return null;
  const len = charLength(t);
  if (len >= ISLAND_TITLE_MIN && len <= ISLAND_TITLE_MAX) return t;
  const compact = t.replace(/\s/g, "");
  const clen = charLength(compact);
  return clen >= ISLAND_TITLE_MIN && clen <= ISLAND_TITLE_MAX ? compact : null;
}

function cleanEpisodeTitle(v: unknown): string | null {
  const t = collapse(textOf(v).replace(TITLE_STRIP, "")).replace(/[.。]+$/, "");
  if (!t) return null;
  if (charLength(t) <= EPISODE_TITLE_MAX) return t;
  const cut = Array.from(t).slice(0, EPISODE_TITLE_MAX).join("");
  const space = cut.lastIndexOf(" ");
  return (space >= 8 ? cut.slice(0, space) : cut).trim();
}

function fallbackIslandTitle(memory: StoryMemory, episodeNumber: number): string {
  const candidates = [
    memory.characters[0],
    memory.places.find((p) => p.endsWith("섬")),
    memory.items[0],
  ];
  for (const c of candidates) {
    if (!c) continue;
    const base = collapse(c.replace(/\(.*?\)|\[.*?\]/g, ""));
    if (!base) continue;
    const title = base.endsWith("섬") ? base : `${base} 섬`;
    const len = charLength(title);
    if (len >= ISLAND_TITLE_MIN && len <= ISLAND_TITLE_MAX) return title;
  }
  return `${episodeNumber}번째 섬`;
}

/** LLM 없이 턴 기록을 그대로 엮은 동화책 (mock / storybookText 깨졌을 때) */
function buildPlainStorybook(turns: TurnRecord[], callName: string, skipChildAt: number | null): string {
  const paras: string[] = [];
  turns.forEach((t, i) => {
    const parts: string[] = [];
    const child = collapse(textOf(t.childText));
    if (child && i !== skipChildAt) parts.push(`${callName}은 "${clip(child, 60)}" 하고 말했어.`);
    const narration = storySentences(textOf(t.narration)).join(" ");
    if (narration) parts.push(narration);
    if (parts.length) paras.push(parts.join(" "));
  });
  if (!paras.length) paras.push("무전기 너머에서 작은 섬의 신호가 들려왔어.");
  const capped = paras.length > 12 ? [...paras.slice(0, 6), ...paras.slice(-6)] : paras;
  return capped.join("\n\n");
}

/** 아이 발화가 0개일 때: 내레이션 몇 문장 + 조용한 마무리 (1~2문단) */
function buildQuietStorybook(turns: TurnRecord[], callName: string): string {
  const sentences = turns.flatMap((t) => storySentences(textOf(t.narration))).slice(0, 4);
  const first = sentences.length ? sentences.join(" ") : "무전기 너머에서 작은 섬의 신호가 들려왔어.";
  return [
    first,
    `오늘 밤 ${callName}은 조용히 무전을 들었어. 작은 섬은 ${callName}이 다시 찾아올 날을 기다리며 반짝반짝 빛났지.`,
  ].join("\n\n");
}

// ───────────────────────── 프롬프트 ─────────────────────────

function buildSystemPrompt(callName: string): string {
  return `너는 '상상 무전기' 탐험대 본부의 기록 담당 대원이야. 방금 끝난 잠자리 모험(만 4~9세 아이와 무전기로 나눈 대화)을 정리한다. 아이는 탐험대 '대장님'이고, 회차마다 새로운 섬을 탐험한다. 대화에서 [무전기]는 이야기꾼의 말, [대장님]은 아이의 말이다.

만들 것:

1) worldMemory — 다음 모험에서 이어 쓸 이야기 세계의 기억
- characters, items, places: [지난 모험의 기억]과 이번 모험을 합친 목록. 각각 최대 6개, 짧은 이름으로(예: "노랑이(노란 아기 용)", "종이 로켓", "구름 섬"). 대장님이 직접 이름을 붙였거나 아끼고 챙긴 것을 앞에 둔다. 지난 기억 중 이번에 다시 나왔거나 대장님이 좋아한 것은 남긴다. 같은 대상은 한 번만 쓴다.
- keyEvents: 이번 모험에서 대장님이 한 일만 1~3개, 시간 순서대로. 짧은 과거형 문장(예: "대장님이 다친 노랑이에게 붕대를 감아 주었다"). 지난 사건은 다시 쓰지 않는다.
- nextHook: 다음 모험의 첫 장면이 이어받을 수 있는 한 문장(예: "노랑이가 새 친구를 데려오기로 했다").
- 이야기 세계의 내용만 쓴다. 대장님이 말했더라도 현실 정보(학교·유치원·학원 이름, 주소, 전화번호, 가족·친구와의 다툼이나 고민, 현실의 사람 이야기)는 절대 넣지 않는다.

2) storybookText — 그림책 본문
- 이번 모험을 짧은 그림책 글로 다시 쓴다. 쉬운 반말 동화체("~했어", "~였지").
- 짧은 문단 6~12개. 문단 사이는 빈 줄(JSON 문자열 안에서는 \\n\\n). 한 문단은 1~3문장.
- 말하면서 생긴 반복·더듬음·군말은 다듬되, 대장님의 아이디어와 선택은 바꾸지 않는다. 대장님이 고른 것, 지은 이름, 한 행동은 하나도 빠짐없이 그대로 넣는다. 대장님이 하지 않은 선택을 지어내지 않는다.
- 아이는 "${callName}" 또는 "대장님"이라고 부른다.
- 이름을 묻고 답한 부분, 무전기 마지막 인사("${CLOSING_LINE}"), 듣는 사람에게 묻는 질문이나 선택지는 넣지 않는다. 질문 없이 포근하게 끝낸다.
- 무섭거나 위험한 내용은 부드럽게 바꾸고, 현실 정보는 넣지 않는다.

3) islandTitle — 오늘 탐험한 섬의 이름. 2~8글자로 귀엽게(예: "노랑이 섬", "별사탕 섬").
4) episodeTitle — 오늘 이야기의 제목. 20자 이내(예: "다친 용과 떠나는 로켓").

출력은 아래 형식의 JSON 하나만. 다른 글자 금지.
{"worldMemory": {"characters": ["..."], "items": ["..."], "places": ["..."], "keyEvents": ["..."], "nextHook": "..."}, "storybookText": "...", "islandTitle": "...", "episodeTitle": "..."}`;
}

function transcriptLines(turns: TurnRecord[]): string[] {
  const lines: string[] = [];
  for (const t of turns.slice(-TRANSCRIPT_MAX_TURNS)) {
    const child = collapse(textOf(t.childText));
    const narration = collapse(removeSignOff(textOf(t.narration)));
    if (child) lines.push(`[대장님] ${clip(child, TRANSCRIPT_LINE_MAX)}`);
    if (narration) lines.push(`[무전기] ${clip(narration, TRANSCRIPT_LINE_MAX)}`);
  }
  return lines;
}

function buildMessages(
  turns: TurnRecord[],
  prev: StoryMemory,
  callName: string,
  episodeNumber: number
): ChatMessage[] {
  const memoryText = isEmptyMemory(prev) ? "없음 (첫 모험)" : JSON.stringify(prev, null, 2);
  const user = [
    `[대장님 호칭] ${callName}`,
    `[회차] ${episodeNumber}번째 모험`,
    "",
    "[지난 모험의 기억]",
    memoryText,
    "",
    "[이번 모험 대화] (위에서 아래로 시간 순서)",
    ...transcriptLines(turns),
    "",
    "규칙대로 JSON 하나만 출력해.",
  ].join("\n");
  return [
    { role: "system", content: buildSystemPrompt(callName) },
    { role: "user", content: user },
  ];
}

// ───────────────────────── 메인 ─────────────────────────

export async function summarizeEpisode(input: SummarizeEpisodeInput): Promise<SummarizeEpisodeResult> {
  const turns: TurnRecord[] = Array.isArray(input.turns) ? input.turns : [];
  const episodeNumber =
    Number.isFinite(input.episodeNumber) && input.episodeNumber > 0 ? Math.floor(input.episodeNumber) : 1;
  const prev = sanitizeMemory(input.prevMemory);

  // 게스트 1화: turn 0이 이름을 물었으면 turn 1 답은 이름 답 → 이름 찾기, 동화책·mock 기억에서는 제외
  const nameAsked = turns.length > 1 && textOf(turns[0]?.narration).includes("이름");
  const givenName = collapse(textOf(input.childName)) || null;
  const childName = givenName ?? (nameAsked ? detectChildName(textOf(turns[1]?.childText)) : null);
  const skipChildAt = nameAsked ? 1 : null;
  const callName = childName ? `${childName} 대장님` : "대장님";

  // 1) 아이 발화 0개: LLM 없이 기본 결과
  const spoken = turns.some((t) => collapse(textOf(t.childText)).length > 0);
  if (!spoken) {
    return {
      worldMemory: prev,
      storybookText: buildQuietStorybook(turns, callName),
      islandTitle: QUIET_ISLAND_TITLE,
      episodeTitle: QUIET_EPISODE_TITLE,
      childName,
    };
  }

  // 2) 키 없음(로컬 개발): 턴 기록으로 만든 결정적 mock. 계약 형태는 실제와 동일.
  if (!hasLlmKey()) {
    const said = turns
      .map((t, i) => (i === skipChildAt ? "" : collapse(textOf(t.childText))))
      .filter(Boolean);
    const worldMemory = mergeWorldMemory(prev, {
      keyEvents: said.slice(-2).map((s) => `대장님이 "${clip(s, 20)}" 하고 말했다`),
      nextHook: `${episodeNumber + 1}번째 섬에서 새로운 신호가 오기로 했다`,
    });
    return {
      worldMemory,
      storybookText: buildPlainStorybook(turns, callName, skipChildAt),
      islandTitle: `${episodeNumber}번째 섬`,
      episodeTitle: `대장님의 ${episodeNumber}번째 모험`,
      childName,
    };
  }

  // 3) LLM 1회 호출. 네트워크·HTTP·JSON 파싱 실패는 그대로 throw.
  const raw = await chatJSON<unknown>({
    model: REPORT_MODEL,
    messages: buildMessages(turns, prev, callName, episodeNumber),
    maxTokens: 2500,
    temperature: 0.6,
    timeoutMs: 30000,
  });
  if (!isRecord(raw)) throw new Error("SUMMARY_INVALID: not a JSON object");

  const memRaw = isRecord(raw.worldMemory)
    ? raw.worldMemory
    : MEMORY_KEYS.some((k) => k in raw)
      ? raw // worldMemory 없이 평평하게 온 경우
      : null;
  let storybookText = cleanStorybook(raw.storybookText ?? raw.storybook);
  if (!memRaw && !storybookText) {
    throw new Error("SUMMARY_INVALID: missing worldMemory and storybookText");
  }

  const fallbacks: string[] = [];
  if (!memRaw) fallbacks.push("worldMemory");

  const worldMemory = mergeWorldMemory(prev, memRaw);

  let islandTitle = cleanIslandTitle(raw.islandTitle);
  if (!islandTitle) {
    fallbacks.push("islandTitle");
    islandTitle = fallbackIslandTitle(worldMemory, episodeNumber);
  }
  let episodeTitle = cleanEpisodeTitle(raw.episodeTitle);
  if (!episodeTitle) {
    fallbacks.push("episodeTitle");
    episodeTitle = `${islandTitle}의 모험`;
  }

  if (storybookText) storybookText = dropTitleLine(storybookText, [episodeTitle, islandTitle]);
  if (!storybookText) {
    fallbacks.push("storybookText");
    storybookText = buildPlainStorybook(turns, callName, skipChildAt);
  }

  if (fallbacks.length) console.warn(`[summarizer] LLM 출력 일부 대체: ${fallbacks.join(", ")}`);

  return { worldMemory, storybookText, islandTitle, episodeTitle, childName };
}
