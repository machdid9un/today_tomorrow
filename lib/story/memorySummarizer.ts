// 종료 후 기억 요약 + 동화책 다듬기 + 제목 생성. 소유: 역할 3.
// 순수 함수: DB를 직접 읽거나 쓰지 않는다. 호출자(/api/episodes/[id]/complete)가 턴·지난 기억을 넘기고,
// 결과를 worlds.memory_json / worlds.child_name / episodes.storybook_text / island_title / title 에 저장한다.
// LLM 호출은 회차당 1번(REPORT_MODEL). 키가 없으면 결정적 mock, 아이 발화가 0개면 LLM 없이 기본 결과.
import type { StoryMemory } from "@/types";
import type { TurnRecord } from "./contextStore";
import { chatJSON, hasLlmKey, REPORT_MODEL, type ChatMessage } from "./llm";
import { withSubject } from "./persona";
import { CLOSING_LINE } from "./prompts";
import { hasPersonalInfo, isSafetyConcern } from "./safety";
import { progressLine, RAINBOW_COLORS, remainingColors, type PlanetProgress, type StoryTheme } from "./themes";

export interface SummarizeEpisodeInput {
  turns: TurnRecord[];
  /** 지난 회차까지 누적된 기억 (worlds.memory_json). 첫 회차면 null. */
  prevMemory: StoryMemory | null;
  childName: string | null;
  episodeNumber: number;
  /** 오늘의 별과 시즌 진행 (없으면 별 정보 없이 정리) */
  planet?: { theme: StoryTheme; progress: PlanetProgress | null; goal: string; stageId: string } | null;
}

/** 오늘 이 별에서 생긴 일 (시즌 진행 계산용) */
export interface PlanetUpdate {
  /** 숨은 무지개: 오늘 찾은 색 (남은 색 중 하나, 아니면 null) */
  found: string | null;
  /** 아이가 이 별에 만든 것·지은 이름·주문 (아이 말에 근거한 것만) */
  made: string[];
}

export interface SummarizeEpisodeResult {
  /** 지난 기억 + 이번 회차를 합친 기억. worlds.memory_json에 그대로 저장. */
  worldMemory: StoryMemory;
  storybookText: string;
  islandTitle: string;
  episodeTitle: string;
  /** 알고 있는 이름(입력값 또는 1턴 답에서 찾은 이름). worlds.child_name용. */
  childName: string | null;
  /** 오늘의 별에서 생긴 일. finalizeEpisode가 시즌 진행(worldMemory.planets)을 계산할 때 쓴다 */
  planetUpdate?: PlanetUpdate;
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

const QUIET_ISLAND_TITLE = "조용한 별";
const QUIET_EPISODE_TITLE = "조용한 밤의 이야기";

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

const SIGN_OFF_PATTERN =
  /오늘\s*(?:무전은|이야기는)\s*여기까지(?:예용|예요|야)?[.!…~]*\s*(?:잘\s*자용?[,.!…~]*\s*)?(?:내일\s*또\s*만나용?[.!…~]*)?/g;

/** 종료 멘트(CLOSING_LINE) 제거 */
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
  "대장", "대장님", "탐험대", "치익", "여기", "이름", "이야기", "용", "친구",
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
    memory.places.find((p) => /(섬|별|행성)$/.test(p)),
    memory.items[0],
  ];
  for (const c of candidates) {
    if (!c) continue;
    const base = collapse(c.replace(/\(.*?\)|\[.*?\]/g, ""));
    if (!base) continue;
    const title = /(섬|별|행성)$/.test(base) ? base : `${base} 별`;
    const len = charLength(title);
    if (len >= ISLAND_TITLE_MIN && len <= ISLAND_TITLE_MAX) return title;
  }
  return `${episodeNumber}번째 별`;
}

/** LLM 없이 턴 기록을 그대로 엮은 동화책 (mock / storybookText 깨졌을 때) */
function buildPlainStorybook(turns: TurnRecord[], callName: string, skipChildAt: number | null): string {
  const paras: string[] = [];
  turns.forEach((t, i) => {
    const parts: string[] = [];
    const child = collapse(textOf(t.childText));
    if (child && i !== skipChildAt) parts.push(`${withSubject(callName)} 말했어요. “${clip(child, 60)}”`);
    const narration = storySentences(textOf(t.narration)).join(" ");
    if (narration) parts.push(narration);
    if (parts.length) paras.push(parts.join(" "));
  });
  if (!paras.length) paras.push("오늘 밤, 작은 별에서 누군가 도와 달라는 소리가 들려왔어요.");
  const capped = paras.length > 12 ? [...paras.slice(0, 6), ...paras.slice(-6)] : paras;
  return capped.join("\n\n");
}

/** 아이 발화가 0개일 때: 내레이션 몇 문장 + 조용한 마무리 (1~2문단) */
function buildQuietStorybook(turns: TurnRecord[], callName: string): string {
  const sentences = turns.flatMap((t) => storySentences(textOf(t.narration))).slice(0, 4);
  const first = sentences.length ? sentences.join(" ") : "오늘 밤, 작은 별에서 누군가 도와 달라는 소리가 들려왔어요.";
  return [
    first,
    `오늘 밤 ${withSubject(callName)} 조용히 이야기를 들었어요. 작은 별은 ${withSubject(callName)} 다시 찾아올 날을 기다리며 반짝반짝 빛났어요.`,
  ].join("\n\n");
}

// ───────────────────────── 지어낸 아이 대사 막기 ─────────────────────────

function normKo(s: string): string {
  return s.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
}

function bigramOverlap(q: string, s: string): number {
  if (q.length < 2) return s.includes(q) ? 1 : 0;
  let hit = 0;
  for (let i = 0; i + 2 <= q.length; i++) if (s.includes(q.slice(i, i + 2))) hit++;
  return hit / (q.length - 1);
}

/** 인용이 실제 아이 말에서 온 것인가 (더듬음 제거·띄어쓰기 차이·일부 인용 허용) */
function isGenuineQuote(quote: string, said: string[]): boolean {
  const q = normKo(quote);
  if (!q) return true;
  return said.some((s) => s.includes(q) || (s.length >= 2 && q.includes(s)) || bigramOverlap(q, s) >= 0.6);
}

/** '아이가 만든 것' 목록 중 아이 말에 근거가 있는 것만 남긴다 (괄호 설명은 떼고 비교) */
export function groundedMade(made: string[], childTexts: string[]): string[] {
  const said = childTexts.map(normKo).filter(Boolean);
  return made
    .map((m) => collapse(m).slice(0, 20))
    .filter((m) => {
      const core = normKo(m.replace(/\(.*?\)/g, ""));
      return core.length >= 1 && said.some((s) => s.includes(core) || (core.length >= 3 && bigramOverlap(core, s) >= 0.6));
    })
    .slice(0, 3);
}

/** 오늘 찾은 색: LLM이 준 값이 남은 색이면 그것, 아니면 갈림길 뒤 이야기 용의 말에 나온 남은 색 중 첫 번째 */
function detectFoundColor(llmFound: unknown, turns: TurnRecord[], progress: PlanetProgress | null): string | null {
  const remaining = remainingColors(progress);
  const v = typeof llmFound === "string" ? llmFound.replace(/색$/, "").trim() : "";
  const norm: Record<string, string> = { 빨간: "빨강", 노란: "노랑", 파란: "파랑", 주황: "주황", 초록: "초록", 남: "남색", 보라: "보라" };
  const color = remaining.includes(v) ? v : norm[v] && remaining.includes(norm[v]) ? norm[v] : null;
  if (color) return color;
  const later = turns.slice(3).map((t) => textOf(t.narration)).join(" ");
  return remaining.find((c) => later.includes(c)) ?? null;
}

const SPEECH = "(?:말했어요|말했지요|대답했어요|외쳤어요|속삭였어요|소리쳤어요|말했답니다)";

function escapeRe(x: string): string {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "지우가 말했어요. “…”" / "“…” 지우가 외쳤어요." — 아이를 가리키는 말(이름·친구·대장님) 뒤 말하기 동사 */
function quoteRegexes(speakers: string[]): [RegExp, RegExp] {
  const who = `(?:${speakers.map(escapeRe).join("|")})`;
  return [
    new RegExp(`([^.!?…\\n“”]*${who}[^.!?…\\n“”]*?${SPEECH}[.!]?)\\s*“([^”]{1,120})”[.!]?`, "g"),
    new RegExp(`“([^”]{1,120})”[.!]?\\s*((?:[가-힣]+\\s)?${who}[이가은는도]?[^.!?…\\n“”]{0,12}${SPEECH}[.!]?)`, "g"),
  ];
}

/**
 * 아이가 말했다고 적힌 인용 중 실제 아이 말에 없는 것(지어낸 대사)을 문장째 뺀다.
 * speakers: 동화책에서 아이를 가리키는 말(아이 이름 등). 현실 위험 발화·개인정보는 '실제 말' 목록에서 빼서, 인용되면 같이 지워진다.
 */
export function dropFabricatedChildQuotes(
  storybook: string,
  childTexts: string[],
  speakers: string[] = ["친구", "대장님"]
): { text: string; dropped: string[] } {
  const [QUOTE_AFTER, QUOTE_BEFORE] = quoteRegexes(speakers.filter(Boolean));
  const said = childTexts
    .filter((t) => t && !isSafetyConcern(t) && !hasPersonalInfo(t))
    .map(normKo)
    .filter(Boolean);
  const dropped: string[] = [];
  let text = storybook.replace(QUOTE_AFTER, (whole, _intro: string, quote: string) => {
    if (isGenuineQuote(quote, said)) return whole;
    dropped.push(quote);
    return "";
  });
  text = text.replace(QUOTE_BEFORE, (whole, quote: string) => {
    if (isGenuineQuote(quote, said)) return whole;
    dropped.push(quote);
    return "";
  });
  if (!dropped.length) return { text: storybook, dropped };
  const paras = text
    .split("\n\n")
    .map((p) => collapse(p))
    .filter((p) => charLength(p.replace(/\s/g, "")) >= 2);
  return { text: paras.join("\n\n"), dropped };
}

// ───────────────────────── 프롬프트 ─────────────────────────

function buildSystemPrompt(callName: string): string {
  const subj = withSubject(callName);
  return `너는 '상상 무전기'의 이야기 기록 담당이야. 방금 끝난 잠자리 이야기(만 4~9세 아이와 귀가 큰 아기 용 '이야기 용'이 함께 만든 대화)를 정리한다. 이야기 용은 '우리별'이라 부르는 작은 행성들에 살고, 아이와 매번 한 별에서 모험한다. 대화에서 [이야기 용]은 용의 말('~용' 말투), [아이]는 아이의 말이다.

만들 것:

1) worldMemory — 다음 이야기에서 이어 쓸 이야기 세계의 기억
- characters, items, places: [지난 이야기의 기억]과 이번 이야기를 합친 목록. 각각 최대 6개, 짧은 이름으로(예: "노랑이(노란 아기 고래)", "종이배", "반딧불 오두막"). 아이가 직접 이름을 붙였거나 아끼고 챙긴 것을 앞에 둔다. 지난 기억 중 이번에 다시 나왔거나 아이가 좋아한 것은 남긴다. 같은 대상은 한 번만 쓴다. 이야기 용 자신은 넣지 않는다.
- keyEvents: 이번 이야기에서 아이가 한 일만 1~3개, 시간 순서대로. 짧은 과거형 문장(예: "${subj} 다친 노랑이에게 반창고를 붙여 주었다"). 지난 사건은 다시 쓰지 않는다. 졸려서 잠든 일, 이야기를 끝낸 일 같은 마무리 장면은 넣지 않는다. 대화에 [메모]로 "대답하지 않았다"고 적힌 질문의 선택은 기억에도 동화책에도 쓰지 않는다. 아이가 하지 않은 선택이나 결말을 지어내지 않는다.
- nextHook: 다음 이야기의 첫 장면이 이어받을 수 있는 한 문장(예: "노랑이가 새 친구를 데려오기로 했다").
- 이야기 세계의 내용만 쓴다. 아이가 말했더라도 현실 정보(학교·유치원·학원 이름, 주소, 전화번호, 가족·친구와의 다툼이나 고민, 현실의 사람 이야기)는 절대 넣지 않는다.

2) storybookText — 부모가 아이에게 소리 내어 읽어 줄 그림책 본문
- 문체: 다정한 해요체 동화체(서술은 표준 해요체, '~용' 말투는 쓰지 않는다). 서술은 "~했어요", "~이에요"가 기본이고 "~지요"는 가끔. 마지막 문장도 해요체("~잠이 들었어요")로 끝낸다. 반말 서술("~했어", "~했지", "~했단다")은 쓰지 않는다. 같은 어미를 세 문장 연속 쓰지 않는다. 과거형("불었어요")과 현재형("불어요")을 섞어 리듬을 만든다.
- 등장: 주인공은 아이("${callName}")이고, 이야기 용은 곁의 친구로 함께 나온다. 이야기 용의 대사를 넣는다면 '~용' 말투로 쓴다(예: 이야기 용이 속삭였어요. “쉿, 소리가 들려용.”).
- 길이: 문단 5~7개, 문단마다 2~3문장. 문단 사이는 빈 줄(JSON 문자열 안에서는 \\n\\n). 한 문장은 30자 안팎으로 짧게(길어도 40자).
- 흐름: ① 밤과 오늘의 별, 소리 단서로 시작 → ② 만난 친구(아이가 [아이] 줄에서 이름을 직접 말했을 때만 "${subj} 지어 준 이름, ○○"처럼 이름 지은 일을 적고, 그 뒤로는 이름을 계속 부른다. 이야기 용이 붙인 이름이나 원래 이름을 아이가 지었다고 쓰지 않는다) → ③ 생긴 문제 하나 → ④ 아이의 결정 → ⑤ 그 결정 "덕분에/그래서" 달라진 결과(문제는 꼭 풀어 준다. 고르지 않은 쪽 — 예: 떠나는 배 — 도 "배는 내일 밤 다시 오기로 했어요"처럼 한 문장으로 포근하게 정리한다) → ⑥ 조용히 잠드는 마무리.
- 아이의 목소리: 아이가 직접 한 말 중 결정·아이디어·이름이 담긴 말 2~3개를 둥근 큰따옴표(“ ”) 대사로 원문 그대로 인용한다. 반말·조사도 고치지 않고 더듬는 말(어, 그, 음)만 뺀다. 누가 말했는지 밝히되, 매번 "~가 말했어요."로 똑같이 쓰지 않는다(외쳤어요, 속삭였어요, 대답했어요, 또는 대사를 먼저 쓰고 뒤에 말한 사람). 예) ${subj} 말했어요. “옆에 있을래.” / “노랑이!” ${subj} 외쳤어요.
- 한 낱말 대답(예: "고래")을 여러 번 했으면 인용은 한 번만 한다. 아이가 "무서워"처럼 마음을 말했으면 그 마음을 존중하는 장면으로 잇고, 하지 않은 용감한 행동을 지어내지 않는다.
- 인용은 [아이] 줄에 실제로 있는 말만 쓴다. 아이가 하지 않은 말을 아이 대사로 지어내지 않는다(친구 인물과 이야기 용의 대사는 지어내도 된다).
- 인용하지 않는 말: AI냐는 질문, [메모]에서 쓰지 말라고 한 말, 생략된 말. 졸리다는 말은 마지막 문단에 인용해도 좋다.
- 소리 내어 읽기: 의성어·의태어 5~8개(반짝반짝, 살금살금처럼 되풀이하는 말). 앞부분은 또렷한 소리, 뒷부분은 부드러운 소리(살랑살랑, 솔솔, 새근새근). 이번 이야기에 어울리는 짧은 후렴 하나를 새로 만들어 처음·가운데·끝에 되풀이하고, 마지막엔 잠 쪽으로 살짝 바꾼다. 문단마다 소리·감촉·온도 같은 감각 하나.
- 잠드는 곡선: 마지막 두 문단에는 새 사건 없이 문장을 더 짧게, 소리와 빛이 점점 줄어들게 쓴다. 질문·교훈 없이 끝내고, "아침" 같은 낮 장면으로 끝내지 않는다.
- 지어내지 않기: 장면을 잇는 작은 묘사는 덧붙여도 되지만, 아이가 하지 않은 선택·행동·결말은 만들지 않는다. 아이가 답하지 않은 질문의 선택은 쓰지 않는다.
- 아이는 "${callName}"(이름)으로 부른다. 이름을 묻고 답한 부분, 이야기 용의 마지막 인사("${CLOSING_LINE}")는 넣지 않는다.
- 무섭거나 위험한 내용은 부드럽게 바꾸고, 현실 정보는 넣지 않는다.

[문단 뼈대 — 이번 이야기의 내용으로 채운다. 매 회차 같은 문장으로 시작하거나 끝내지 않는다]
1문단: 소리 단서(대화에 나온 소리·빛·냄새)나 장면으로 시작하고("○○ 행성의 밤이에요" 같은 같은 틀로 매번 시작하지 않는다), 그 단서로 만든 후렴을 처음 들려준다.
2문단: 도와 달라던 친구를 만난다. 아이의 첫 대사를 인용하고, 이름을 지어 줬으면 그 일을 적는다.
3문단: 생긴 문제 하나와 감각 묘사 하나.
4문단: 아이의 결정을 대사로 인용한다.
5문단: 그 결정 덕분에 달라진 결과, 고르지 않은 쪽의 포근한 정리, 후렴 두 번째.
6문단: 소리와 빛이 잦아드는 밤.
7문단: 후렴을 잠 쪽으로 바꾼 짧은 마지막 문장(이번 이야기의 친구나 물건으로 끝낸다).
짧은 이야기면 2·3문단이나 5·6문단을 합쳐 5문단으로 써도 된다.

3) islandTitle — 오늘 이야기의 장소 이름(오늘의 별 안의 한 곳). 2~8글자로 귀엽게(예: "반딧불 오두막", "별사탕 언덕").
4) episodeTitle — 오늘 이야기의 제목. 20자 이내(예: "다친 고래와 떠나는 배").
5) planetUpdate — [오늘의 별]이 주어졌을 때, 오늘 이 별에서 생긴 일.
- found: 숨은 무지개 행성에서 오늘 찾아 깨운 색 친구의 색 이름(빨강·주황·노랑·초록·파랑·남색·보라 중 하나). 다른 별이거나 찾지 못했으면 null.
- made: 아이가 이 별에 직접 만든 것·지어 준 이름·외친 주문·낸 화해 방법·새로 지은 색 이름 0~3개. 아이 말 그대로 짧게(예: "깜빡나무(밤에 불 켜 주는 나무)", "폭신 이불", "올라가라 주문", "같이 보기", "메론구름색"). 아이가 하지 않은 것은 넣지 않는다.
- 동화책에도 오늘의 별 이야기가 살아 있게 쓴다: 첫 문단이나 둘째 문단에 별 이름을 한 번 쓰고, 아이가 실제로 한 말 때문에 이 별이 달라진 것(나무에 이름이 생김, 색이 돌아옴, 두 마을이 웃음, 비가 거꾸로 내림)만 결과 문단에 쓴다. 아이가 하지 않은 행동·고르지 않은 쪽·짓지 않은 이름을 아이가 한 것처럼 쓰지 않는다(대화에서 이야기 용이 정한 것은 '이야기 용이 ~했어요'로 쓴다). 숨은 무지개에서 대화 속에서 색 친구를 실제로 깨웠을 때만 '이제 일곱 색 중 N가지를 찾았어요'(N은 [오늘의 별]에 적힌 수)를 한 번 넣는다.

출력은 아래 형식의 JSON 하나만. 다른 글자 금지.
{"worldMemory": {"characters": ["..."], "items": ["..."], "places": ["..."], "keyEvents": ["..."], "nextHook": "..."}, "storybookText": "...", "islandTitle": "...", "episodeTitle": "...", "planetUpdate": {"found": null, "made": ["..."]}}`;
}

/**
 * LLM에 줄 대화 기록.
 * - 게스트 1화의 이름 묻고 답하기(turn 0 내레이션, turn 1 대답)는 빼서 동화책·기억에 들어가지 않게 한다.
 * - 마지막 질문에 아이가 답하지 않고 끝났으면(침묵·잠듦) 그 선택을 지어내지 않도록 [메모]를 붙인다.
 */
function transcriptLines(turns: TurnRecord[], skipNameQA: boolean): string[] {
  const lines: string[] = [];
  const offset = Math.max(0, turns.length - TRANSCRIPT_MAX_TURNS);
  turns.slice(offset).forEach((t, k) => {
    const index = offset + k;
    let child = skipNameQA && index === 1 ? "" : collapse(textOf(t.childText));
    const narration = skipNameQA && index === 0 ? "" : collapse(removeSignOff(textOf(t.narration)));
    // 현실 위험 발화·개인정보는 원문을 넘기지 않는다 (동화책·기억에 들어가지 않게)
    let memo = "";
    if (child && isSafetyConcern(child)) {
      child = "(현실 이야기라 기록하지 않음)";
      memo = "[메모] 이 턴의 아이 말과 이야기 용의 위로(어른에게 말하기)는 현실 이야기다. 동화책·기억에 쓰지 말고, 이야기 장면만 이어서 쓴다.";
    } else if (child && hasPersonalInfo(child)) {
      child = "(개인정보라 생략)";
    }
    if (child) lines.push(`[아이] ${clip(child, TRANSCRIPT_LINE_MAX)}`);
    if (narration) lines.push(`[이야기 용] ${clip(narration, TRANSCRIPT_LINE_MAX)}`);
    if (memo) lines.push(memo);
  });
  const lastNarration = collapse(removeSignOff(textOf(turns[turns.length - 1]?.narration)));
  if (/[?？]["'”’)]*$/.test(lastNarration)) {
    lines.push("[메모] 마지막 질문에 아이는 대답하지 않았다(잠들었거나 대화가 끝남). 그 질문의 선택은 정해지지 않았다.");
  }
  return lines;
}

function planetBlock(planet: SummarizeEpisodeInput["planet"]): string[] {
  if (!planet) return [];
  const { theme, progress, goal } = planet;
  const found = (progress?.collected ?? []).filter((c) => RAINBOW_COLORS.includes(c)).length;
  return [
    `[오늘의 별] ${theme.planet} — ${theme.tag}. 놀이: ${theme.play}.`,
    `시즌 줄거리: ${progressLine(theme, progress)}`,
    `오늘 밤 목표: ${goal}.${theme.id === "rainbow" && ["find_primary", "mix_secondary", "night_color"].includes(planet.stageId) ? ` 오늘 색을 찾았다면 이제 일곱 색 중 ${found + 1}가지를 찾은 것이다.` : ""}`,
    "",
  ];
}

function buildMessages(
  turns: TurnRecord[],
  prev: StoryMemory,
  callName: string,
  episodeNumber: number,
  skipNameQA: boolean,
  planet: SummarizeEpisodeInput["planet"] = null
): ChatMessage[] {
  const memoryText = isEmptyMemory(prev) ? "없음 (첫 모험)" : JSON.stringify(prev, null, 2);
  const user = [
    `[아이 이름] ${callName}`,
    `[회차] ${episodeNumber}번째 모험`,
    "",
    ...planetBlock(planet),
    "[지난 모험의 기억]",
    memoryText,
    "",
    "[이번 모험 대화] (위에서 아래로 시간 순서)",
    ...transcriptLines(turns, skipNameQA),
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
  const callName = childName ?? "친구";

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
      keyEvents: said.slice(-2).map((s) => `${withSubject(callName)} "${clip(s, 20)}" 하고 말했다`),
      nextHook: `${episodeNumber + 1}번째 별에서 새로운 친구가 기다리기로 했다`,
    });
    return {
      worldMemory,
      storybookText: buildPlainStorybook(turns, callName, skipChildAt),
      islandTitle: `${episodeNumber}번째 별`,
      episodeTitle: `${callName}의 ${episodeNumber}번째 이야기`,
      childName,
      planetUpdate: input.planet
        ? {
            found: input.planet.theme.id === "rainbow" ? detectFoundColor(null, turns, input.planet.progress) : null,
            made: [],
          }
        : undefined,
    };
  }

  // 3) LLM 1회 호출. 네트워크·HTTP·JSON 파싱 실패는 그대로 throw.
  const raw = await chatJSON<unknown>({
    model: REPORT_MODEL,
    messages: buildMessages(turns, prev, callName, episodeNumber, nameAsked, input.planet ?? null),
    maxTokens: 5000,
    temperature: 0.6,
    timeoutMs: 30000,
    thinking: false, // 동화책·기억 정리는 추론 없이도 충분하고 9초→수 초로 빨라짐 (노트는 추론 유지)
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
  if (storybookText) {
    const childTexts = turns.map((t, i) => (i === skipChildAt ? "" : textOf(t.childText)));
    const guarded = dropFabricatedChildQuotes(storybookText, childTexts, [callName, "친구", "대장님"]);
    if (guarded.dropped.length) {
      console.warn(`[summarizer] 지어낸 대장님 대사 ${guarded.dropped.length}개 제거`);
      storybookText = guarded.text || storybookText;
    }
  }
  if (storybookText) {
    // "지우가 지어 준 이름, 파랑이" — 아이가 그 이름을 실제로 말하지 않았으면 '지어 준'을 뺀다
    const said = normKo(turns.map((t, i) => (i === skipChildAt ? "" : textOf(t.childText))).join(" "));
    storybookText = storybookText.replace(
      /([가-힣A-Za-z]+(?:이가|가|이))\s*지어\s*준\s*이름[,，]?\s*([“"']?)([가-힣A-Za-z]{1,10})/g,
      (m, _who, q, name) => {
        const core = normKo(name).replace(/(이랑|랑|이가|가|는|은|를|을|와|과|도)$/, "");
        return said.includes(core) || (core.length > 1 && said.includes(core.replace(/이$/, ""))) ? m : `${q}${name}`;
      }
    );
  }
  if (!storybookText) {
    fallbacks.push("storybookText");
    storybookText = buildPlainStorybook(turns, callName, skipChildAt);
  }

  if (fallbacks.length) console.warn(`[summarizer] LLM 출력 일부 대체: ${fallbacks.join(", ")}`);

  let planetUpdate: PlanetUpdate | undefined;
  if (input.planet) {
    const pu = isRecord(raw.planetUpdate) ? raw.planetUpdate : {};
    const childTexts = turns.map((t, i) => (i === skipChildAt ? "" : textOf(t.childText)));
    const madeRaw = Array.isArray(pu.made) ? pu.made.filter((x): x is string => typeof x === "string") : [];
    planetUpdate = {
      found: input.planet.theme.id === "rainbow" ? detectFoundColor(pu.found, turns, input.planet.progress) : null,
      made: groundedMade(madeRaw, childTexts),
    };
  }

  return { worldMemory, storybookText, islandTitle, episodeTitle, childName, planetUpdate };
}
