// 주간 마음 리포트 (부모 화면 '주간' 탭). 소유: 역할 4.
// 순수 함수: DB·네트워크를 읽지 않는다. 회차 목록(episodes.report_json 포함)을 받아 한 주를 요약한다.
// 원칙 (reportGenerator.ts와 같음):
//  - 모든 문장은 데이터에 근거한다. 근거가 없으면 그 문장을 만들지 않는다.
//  - 진단·낙인 어휘(FORBIDDEN_TERMS)는 어떤 문장에도 쓰지 않는다. 아이 원문 인용만 예외.
//  - 안전 표시(safetyFlags)가 있는 주는 '맑음'으로 요약하지 않는다.
// 클라이언트 컴포넌트에서도 쓰므로 reportGenerator.ts에서는 '타입만' 가져온다
// (값을 가져오면 storyEngine → contextStore → supabaseServer가 브라우저 번들에 딸려 온다).
import type {
  FORBIDDEN_TERMS as REPORT_FORBIDDEN_TERMS,
  MoodWeather,
  ParentReportOut,
} from "./reportGenerator";
import type { SeedSuggestion } from "./seedRecommend";

// ───────────────────────── 타입 ─────────────────────────

export interface WeeklyEpisodeInput {
  id: string;
  episodeNumber: number;
  /** ISO 시각 (episodes.started_at) */
  startedAt: string;
  title: string | null;
  islandTitle: string | null;
  /** episodes.report_json (생성 실패·진행 중이면 null) */
  report: ParentReportOut | null;
}

export interface WeeklyDay {
  /** 월 화 수 목 금 토 일, 오늘이면 '오늘' */
  label: string;
  /** 월요일 … 일요일 (스크린리더용) */
  weekday: string;
  /** YYYY-MM-DD (서울 기준) */
  date: string;
  /** 10.26 */
  dateLabel: string;
  isToday: boolean;
  isFuture: boolean;
  /** 그날 이야기의 마음 날씨. 이야기가 없거나 리포트가 없으면 null */
  weather: MoodWeather | null;
  /** 그날 마지막 이야기 (하루씩 보기로 이동할 때) */
  episodeId: string | null;
  episodeCount: number;
}

export type WeeklyBulletKind = "mood" | "feeling" | "keyword" | "choices" | "planet" | "count";

export interface WeeklyBullet {
  kind: WeeklyBulletKind;
  text: string;
}

export interface WeeklyQuote {
  text: string;
  /** "수요일 밤" */
  weekdayLabel: string;
  episodeNumber: number;
  episodeId: string;
}

export interface WeeklyReport {
  /** "10월 넷째 주 · 10.26 – 11.01" */
  weekRangeLabel: string;
  weekStart: string;
  weekEnd: string;
  days: WeeklyDay[];
  /** 한 주의 마음 날씨 (가장 많이 나온 날씨, 동률이면 더 온화한 쪽, 안전 표시가 있으면 맑음 금지) */
  weather: MoodWeather | null;
  weatherLabel: string | null;
  /** "이번 주 민준이의 마음 날씨는 맑음" */
  headline: string;
  /** 강조 낱말을 뺀 앞부분 ("이번 주 민준이의 마음 날씨는") */
  headlineLead: string;
  /** 이번 주 이야기 수 (리포트 유무와 상관없이) */
  storyCount: number;
  /** 최대 3개, 모두 데이터 근거 */
  bullets: WeeklyBullet[];
  quote: WeeklyQuote | null;
  hasSafetyFlags: boolean;
  /** 안전 표시가 있었던 이번 주 이야기 (부모가 따로 확인하도록 안내) */
  safetyEpisodeIds: string[];
  /** 이번 주 가장 최근 이야기 (없으면 null) */
  latestEpisodeId: string | null;
}

export interface BuildWeeklyReportOptions {
  childName: string | null;
  /** 기준 시각 (Date 또는 ISO). 이 시각이 속한 서울 기준 월요일 시작 주를 요약한다. */
  today: Date | string;
}

// ───────────────────────── 마음 날씨 라벨 ─────────────────────────

/** reportGenerator.ts의 MOOD_WEATHER_LABEL과 같은 값 (값 import를 피하려고 복사, 키는 타입으로 강제) */
export const WEATHER_LABEL: Record<MoodWeather, string> = {
  sunny: "맑음",
  partly_cloudy: "구름 조금",
  cloudy: "흐림",
  rainy: "비",
};

/** 온화한 순서 (동률일 때 앞쪽을 고른다) */
const GENTLE_ORDER: MoodWeather[] = ["sunny", "partly_cloudy", "cloudy", "rainy"];

export function isMoodWeather(v: unknown): v is MoodWeather {
  return typeof v === "string" && (GENTLE_ORDER as string[]).includes(v);
}

// ───────────────────────── 금지 어휘 ─────────────────────────

type ForbiddenTerm = (typeof REPORT_FORBIDDEN_TERMS)[number];
/** reportGenerator.ts FORBIDDEN_TERMS의 복사본. 원본에 낱말이 늘면 아래 타입 검사가 tsc에서 실패한다. */
const FORBIDDEN = [
  "불안",
  "우울",
  "위축",
  "문제",
  "장애",
  "결핍",
  "성향",
  "경향",
  "공격성",
  "ADHD",
  "진단",
  "치료",
  "상담이 필요",
] as const satisfies readonly ForbiddenTerm[];
type MissingForbidden = Exclude<ForbiddenTerm, (typeof FORBIDDEN)[number]>;
const _forbiddenMirrorIsComplete: [MissingForbidden] extends [never] ? true : never = true;
void _forbiddenMirrorIsComplete;

const BENIGN_COMPOUNDS = ["장애물"];

export function hasForbiddenTerm(text: string): boolean {
  let t = text;
  for (const b of BENIGN_COMPOUNDS) t = t.split(b).join(" ");
  const compact = t.replace(/\s+/g, "").toLowerCase();
  return FORBIDDEN.some((term) => compact.includes(term.replace(/\s+/g, "").toLowerCase()));
}

// ───────────────────────── 이름·조사 ─────────────────────────

function hasBatchim(word: string): boolean {
  const last = Array.from(word.trim()).pop();
  if (!last) return false;
  const code = last.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/** 부르는 이름: 민준 → 민준이, 서아 → 서아. 이름이 없으면 null */
export function familiarName(name: string | null | undefined): string | null {
  const n = (name ?? "").trim();
  if (!n) return null;
  return hasBatchim(n) ? `${n}이` : n;
}

/** 민준이가 / 서아가 / 아이가 */
export function nameWithSubject(name: string | null | undefined): string {
  const f = familiarName(name) ?? "아이";
  return `${f}${hasBatchim(f) ? "이" : "가"}`;
}

/** 민준이는 / 서아는 / 아이는 */
export function nameWithTopic(name: string | null | undefined): string {
  const f = familiarName(name) ?? "아이";
  return `${f}${hasBatchim(f) ? "은" : "는"}`;
}

/** ‘친구’라는 / ‘별빛’이라는 */
function quotedNamed(word: string): string {
  return `‘${word}’${hasBatchim(word) ? "이라는" : "라는"}`;
}

// ───────────────────────── 날짜 (서울, 월요일 시작) ─────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 서울은 일광 절약 시간이 없다
/** 이 시각 전(새벽)에 시작한 이야기는 '전날 밤' 이야기로 본다 */
export const NIGHT_CUTOFF_HOUR = 4;

const WEEKDAY_SHORT = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_FULL = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
const ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째"];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 서울 달력 날짜를 'UTC 자정' 타임스탬프로 표현 (더하기·빼기가 안전) */
function kstCalendarDay(ms: number, shiftHours = 0): number {
  const d = new Date(ms + KST_OFFSET_MS - shiftHours * 60 * 60 * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const mondayIndex = (calendarDay: number) => (new Date(calendarDay).getUTCDay() + 6) % 7;
const dateKey = (calendarDay: number) => {
  const d = new Date(calendarDay);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};
const dotLabel = (calendarDay: number) => {
  const d = new Date(calendarDay);
  return `${pad2(d.getUTCMonth() + 1)}.${pad2(d.getUTCDate())}`;
};

function toMs(v: Date | string): number {
  const ms = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isFinite(ms) ? ms : Date.now();
}

export interface NightInfo {
  /** YYYY-MM-DD (서울, 새벽은 전날) */
  date: string;
  /** 월요일 … */
  weekday: string;
  /** 월 … */
  weekdayShort: string;
  /** 10.28 */
  dateLabel: string;
  /** 10월 28일 */
  longDate: string;
}

/** 이야기 시작 시각 → 그 이야기가 속한 '밤' (서울 기준, 새벽 NIGHT_CUTOFF_HOUR시 전은 전날) */
export function nightOf(startedAt: string): NightInfo | null {
  const ms = Date.parse(startedAt);
  if (!Number.isFinite(ms)) return null;
  const day = kstCalendarDay(ms, NIGHT_CUTOFF_HOUR);
  const d = new Date(day);
  const idx = mondayIndex(day);
  return {
    date: dateKey(day),
    weekday: WEEKDAY_FULL[idx],
    weekdayShort: WEEKDAY_SHORT[idx],
    dateLabel: dotLabel(day),
    longDate: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`,
  };
}

// ───────────────────────── 집계 도우미 ─────────────────────────

/** 가장 많이 나온 날씨. 동률이면 더 온화한 쪽(맑음 > 구름 조금 > 흐림 > 비). */
export function dominantWeather(list: MoodWeather[]): MoodWeather | null {
  if (!list.length) return null;
  const counts = new Map<MoodWeather, number>();
  for (const w of list) counts.set(w, (counts.get(w) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return GENTLE_ORDER.find((w) => counts.get(w) === max) ?? null;
}

const hasFlags = (r: ParentReportOut | null) => Boolean(r && Array.isArray(r.safetyFlags) && r.safetyFlags.length);
const weatherOf = (r: ParentReportOut | null): MoodWeather | null =>
  r && isMoodWeather(r.moodWeather) ? r.moodWeather : null;
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];

const UNSURE_RE = /(몰라|모르겠|글쎄)/;
const HESITATE_RE = /(망설|고르기\s*어려|머뭇)/;
// 인용으로 고르지 않을 말: 위험 신호·개인정보·잠자리 마무리 말
const SAFETY_QUOTE_RE = /(때려|때렸|때린|괴롭|죽고\s*싶|죽어\s*버릴|사라지고\s*싶|다쳤|아파)/;
const PERSONAL_RE = /(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}|\d+\s*동\s*\d+\s*호)/;
const SLEEP_RE = /^(졸려|잘래|그만|자고\s*싶|이제\s*잘)/;
const KEYWORD_SKIP = new Set(["이야기", "용아", "몰라", "졸려", "잘래"]);

// ───────────────────────── 진입점 ─────────────────────────

export function buildWeeklyReport(
  episodes: WeeklyEpisodeInput[],
  { childName, today }: BuildWeeklyReportOptions
): WeeklyReport {
  const todayDay = kstCalendarDay(toMs(today));
  const weekStart = todayDay - mondayIndex(todayDay) * DAY_MS;
  const weekEnd = weekStart + 6 * DAY_MS;
  const startDate = new Date(weekStart);

  const weekRangeLabel = `${startDate.getUTCMonth() + 1}월 ${
    ORDINAL[Math.min(Math.ceil(startDate.getUTCDate() / 7), 5) - 1]
  } 주 · ${dotLabel(weekStart)} – ${dotLabel(weekEnd)}`;

  // 이번 주 이야기만, 오래된 순
  type Placed = WeeklyEpisodeInput & { ms: number; night: number; dayIndex: number };
  const placed: Placed[] = [];
  for (const ep of Array.isArray(episodes) ? episodes : []) {
    if (!ep || typeof ep.id !== "string") continue;
    const ms = Date.parse(ep.startedAt);
    if (!Number.isFinite(ms)) continue;
    const night = kstCalendarDay(ms, NIGHT_CUTOFF_HOUR);
    if (night < weekStart || night > weekEnd) continue;
    placed.push({ ...ep, ms, night, dayIndex: Math.round((night - weekStart) / DAY_MS) });
  }
  placed.sort((a, b) => a.ms - b.ms);

  const days: WeeklyDay[] = WEEKDAY_SHORT.map((short, i) => {
    const day = weekStart + i * DAY_MS;
    const onDay = placed.filter((p) => p.dayIndex === i);
    const weathers = onDay.map((p) => weatherOf(p.report)).filter((w): w is MoodWeather => w !== null);
    let weather = dominantWeather(weathers);
    if (weather === "sunny" && onDay.some((p) => hasFlags(p.report))) weather = "partly_cloudy";
    const withReport = onDay.filter((p) => p.report);
    const pool = withReport.length ? withReport : onDay;
    const latest = pool.length ? pool[pool.length - 1] : null;
    const isToday = day === todayDay;
    return {
      label: isToday ? "오늘" : short,
      weekday: WEEKDAY_FULL[i],
      date: dateKey(day),
      dateLabel: dotLabel(day),
      isToday,
      isFuture: day > todayDay,
      weather,
      episodeId: latest?.id ?? null,
      episodeCount: onDay.length,
    };
  });

  const reports = placed.filter((p) => p.report) as (Placed & { report: ParentReportOut })[];
  const safetyEpisodeIds = reports.filter((p) => hasFlags(p.report)).map((p) => p.id);
  const hasSafetyFlags = safetyEpisodeIds.length > 0;

  // 한 주의 날씨 = 요일 아이콘(부모가 보는 것)의 최빈값
  const dayWeathers = days.map((d) => d.weather).filter((w): w is MoodWeather => w !== null);
  let weather = dominantWeather(dayWeathers);
  if (weather === "sunny" && hasSafetyFlags) weather = "partly_cloudy";
  const weatherLabel = weather ? WEATHER_LABEL[weather] : null;

  const familiar = familiarName(childName);
  const possessive = familiar ? `${familiar}의` : "우리 아이의";
  let headlineLead: string;
  let headline: string;
  if (!placed.length) {
    headlineLead = "이번 주에는 아직 이야기가 없어요";
    headline = headlineLead;
  } else if (!weatherLabel) {
    headlineLead = `이번 주 ${possessive} 마음 날씨를 모으고 있어요`;
    headline = headlineLead;
  } else {
    headlineLead = `이번 주 ${possessive} 마음 날씨는`;
    headline = `${headlineLead} ${weatherLabel}`;
  }

  const bullets = buildBullets({ childName, days, reports, weather, storyCount: placed.length });
  const quote = pickQuote(reports);

  return {
    weekRangeLabel,
    weekStart: dateKey(weekStart),
    weekEnd: dateKey(weekEnd),
    days,
    weather,
    weatherLabel,
    headline,
    headlineLead,
    storyCount: placed.length,
    bullets,
    quote,
    hasSafetyFlags,
    safetyEpisodeIds,
    latestEpisodeId: placed.length ? placed[placed.length - 1].id : null,
  };
}

// ───────────────────────── 이런 모습이 보였어요 (3줄) ─────────────────────────

interface BulletInput {
  childName: string | null;
  days: WeeklyDay[];
  reports: (WeeklyEpisodeInput & { report: ParentReportOut; night: number; dayIndex: number })[];
  weather: MoodWeather | null;
  storyCount: number;
}

function buildBullets({ childName, days, reports, weather, storyCount }: BulletInput): WeeklyBullet[] {
  const out: WeeklyBullet[] = [];
  const topic = nameWithTopic(childName);
  const dayWeathers = days.map((d) => d.weather).filter((w): w is MoodWeather => w !== null);
  const count = (w: MoodWeather) => dayWeathers.filter((x) => x === w).length;

  // 1) 마음 날씨 요약 (부드럽게, 요일 아이콘과 같은 근거)
  if (weather && dayWeathers.length) {
    const text: Record<MoodWeather, string> = {
      sunny: `${topic} 이번 주에 기분이 좋아 보였어요.`,
      partly_cloudy: `${topic} 이번 주에 대체로 즐겁게 이야기했어요.`,
      cloudy: `${topic} 이번 주에 조용히 듣는 날이 많았어요.`,
      rainy: `${topic} 이번 주 이야기 속에서 힘든 마음을 말한 날이 있었어요.`,
    };
    out.push({ kind: "mood", text: text[weather] });
  }

  // 2) 망설임·마음 말 (마음 날씨 설명·근거에 실제로 있을 때만)
  const moodTexts = (r: ParentReportOut) => [r.moodNote ?? "", ...strings(r.moodEvidence)].join(" ");
  const unsure = reports.filter((p) => UNSURE_RE.test(moodTexts(p.report)));
  const hesitant = reports.filter((p) => HESITATE_RE.test(moodTexts(p.report)));
  const rainy = reports.filter((p) => weatherOf(p.report) === "rainy");
  // 아이가 힘든 마음을 말한 밤이 먼저 (보호자가 놓치지 않게), 그다음 '몰라'·망설임
  if (rainy.length) {
    const p = rainy[rainy.length - 1];
    const ev = strings(p.report.moodEvidence).find(
      (e) => Array.from(e.trim()).length <= 16 && !SAFETY_QUOTE_RE.test(e) && !PERSONAL_RE.test(e)
    );
    const weekday = days[p.dayIndex].weekday;
    out.push({
      kind: "feeling",
      text: ev ? `${weekday} 밤에는 “${ev.trim()}”라고 마음을 말했어요.` : `${weekday} 밤에는 힘든 마음을 말하기도 했어요.`,
    });
  } else if (unsure.length) {
    out.push({
      kind: "feeling",
      text:
        unsure.length >= 2
          ? "가끔 ‘몰라’ 하며 망설이는 때가 있었어요."
          : `${days[unsure[0].dayIndex].weekday} 밤에는 ‘몰라’ 하며 잠깐 망설였어요.`,
    });
  } else if (hesitant.length) {
    out.push({ kind: "feeling", text: "가끔 고르기 전에 잠깐 망설이는 때가 있었어요." });
  } else if (count("cloudy") > 0 && weather !== "cloudy") {
    out.push({ kind: "feeling", text: "말이 적고 조용한 날도 있었어요." });
  }

  // 3) 많이 말한 낱말 (회차별 keywords 합산)
  const totals = new Map<string, number>();
  for (const p of reports) {
    for (const k of Array.isArray(p.report.keywords) ? p.report.keywords : []) {
      if (!k || typeof k.word !== "string" || typeof k.count !== "number") continue;
      const w = k.word.trim();
      if (w.length < 2 || KEYWORD_SKIP.has(w) || hasForbiddenTerm(w)) continue;
      totals.set(w, (totals.get(w) ?? 0) + k.count);
    }
  }
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) out.push({ kind: "keyword", text: `${quotedNamed(top[0])} 단어를 많이 말했어요.` });

  // 채우기: 직접 고른 횟수 → 별 진행 → 만난 횟수
  const choiceCount = reports.reduce((n, p) => n + strings(p.report.childChoices).length, 0);
  if (choiceCount > 0) out.push({ kind: "choices", text: `이야기 속 갈림길에서 ${choiceCount}번 직접 골랐어요.` });
  const planet = [...reports].reverse().find((p) => p.report.planet && p.report.planet.total > 0)?.report.planet;
  if (planet) {
    out.push({ kind: "planet", text: `${planet.planet} 모험이 ${planet.done}/${planet.total}만큼 나아갔어요.` });
  }
  if (storyCount > 0) out.push({ kind: "count", text: `이번 주에 ${storyCount}번 이야기 용을 만났어요.` });

  return out.filter((b) => !hasForbiddenTerm(b.text)).slice(0, 3);
}

// ───────────────────────── 이번 주의 한 마디 ─────────────────────────

function pickQuote(
  reports: (WeeklyEpisodeInput & { report: ParentReportOut; ms: number; dayIndex: number })[]
): WeeklyQuote | null {
  let best: { score: number; ms: number; quote: WeeklyQuote } | null = null;
  for (const p of reports) {
    const flagged = hasFlags(p.report);
    for (const raw of strings(p.report.childQuotes)) {
      const text = raw.replace(/\s+/g, " ").trim();
      const len = text.replace(/\s+/g, "").length;
      if (len < 4 || SAFETY_QUOTE_RE.test(text) || PERSONAL_RE.test(text) || SLEEP_RE.test(text)) continue;
      // 길수록 좋지만 너무 긴 말은 카드에서 읽기 어렵다. 안전 표시가 있던 밤의 말은 다른 말이 없을 때만.
      const score = Math.min(len, 40) - (len > 60 ? 15 : 0) - (flagged ? 100 : 0);
      if (!best || score > best.score || (score === best.score && p.ms > best.ms)) {
        best = {
          score,
          ms: p.ms,
          quote: {
            text,
            weekdayLabel: `${WEEKDAY_FULL[p.dayIndex]} 밤`,
            episodeNumber: p.episodeNumber,
            episodeId: p.id,
          },
        };
      }
    }
  }
  return best?.quote ?? null;
}

// ───────────────────────── 로컬 개발용 예시 데이터 ─────────────────────────

/** 예시 데이터의 '오늘' (디자인 시안과 같은 주: 10.26 – 11.01) */
export const MOCK_TODAY = "2026-11-01T09:00:00+09:00";
export const MOCK_CHILD = { name: "민준", ageLabel: "2학년" } as const;

export type MockEpisode = WeeklyEpisodeInput & { storybookText: string };

type MockReportSeed = {
  summary: string;
  quotes: string[];
  choices: string[];
  observations: { inference: string; evidence: string[] }[];
  line: string;
  teaser: string;
  weather: MoodWeather;
  moodNote: string;
  moodEvidence: string[];
  keywords: [string, number][];
  planet: { id: string; planet: string; done: number; total: number; goal: string; collected: string[] };
  suggestions: SeedSuggestion[];
};

/** 예시 리포트 조립 (실제 report_json과 같은 모양) */
export function mockReport(s: MockReportSeed): ParentReportOut {
  return {
    summary: s.summary,
    childQuotes: s.quotes,
    childChoices: s.choices,
    observations: s.observations,
    observation: s.observations.map((o) => o.inference).join(" "),
    lineForParent: s.line,
    safetyFlags: [],
    nextEpisodeTeaser: s.teaser,
    moodWeather: s.weather,
    moodNote: s.moodNote,
    moodEvidence: s.moodEvidence,
    keywords: s.keywords.map(([word, count]) => ({ word, count })),
    planet: s.planet,
    seedSuggestions: s.suggestions,
  };
}

const PRAISE_FRESH: SeedSuggestion = {
  preset: "praise",
  label: "칭찬해주기",
  emoji: "🌟",
  reason: "이런 마음도 담아 볼 수 있어요. 용이 아이의 생각이 만든 변화를 알아봐 주는 이야기예요.",
  evidence: null,
};
const REST_FRESH: SeedSuggestion = {
  preset: "rest",
  label: "편히 쉬어가기",
  emoji: "🌙",
  reason: "이런 마음도 담아 볼 수 있어요. 사건 없이 느리고 포근하게 쉬어 가는 이야기예요.",
  evidence: null,
};

/** 민준(2학년)의 한 주: 월~토 6화 (10~15화). 일요일(오늘)은 아직 이야기 전. */
export const MOCK_EPISODES: MockEpisode[] = [
  {
    id: "mock-ep-10",
    episodeNumber: 10,
    startedAt: "2026-10-26T20:40:00+09:00",
    title: "이름 없는 나무의 첫 불빛",
    islandTitle: "반짝나무 언덕",
    report: mockReport({
      summary:
        "민준이는 구름숲에서 이름 없는 나무에게 쓰임과 이름을 지어 줬어요. 나무는 ‘반짝나무’가 되어 숲의 첫 불빛을 켰어요.",
      quotes: ["밤에 불 켜 주는 나무로 하자", "이름은 반짝나무야", "친구들이 안 무섭게 해 줄 거야"],
      choices: ["나무의 쓰임으로 ‘밤에 불 켜 주기’를 골랐어요", "나무 이름을 ‘반짝나무’로 지었어요"],
      observations: [
        {
          inference:
            "“친구들이 안 무섭게 해 줄 거야”라고 말했어요. 나무의 쓰임을 정할 때 숲 친구들을 먼저 떠올린 것처럼 보였어요.",
          evidence: ["친구들이 안 무섭게 해 줄 거야"],
        },
      ],
      line: "반짝나무가 불 켜 주면 숲 친구들은 뭐 하고 놀까?",
      teaser: "내일은 숨은 무지개 행성에서 쿨쿨 자는 색깔 친구를 찾으러 가요.",
      weather: "sunny",
      moodNote: "“반짝나무야”라며 신나게 이름을 지어 줬어요.",
      moodEvidence: ["이름은 반짝나무야"],
      keywords: [["나무", 3], ["친구", 2]],
      planet: { id: "forest", planet: "구름숲 행성", done: 1, total: 6, goal: "이름 없는 나무의 쓰임과 이름을 정해 준다", collected: ["반짝나무"] },
      suggestions: [
        {
          preset: "praise",
          label: "칭찬해주기",
          emoji: "🌟",
          reason:
            "“이름은 반짝나무야”처럼 자기 생각을 이야기에 보탰어요. 내일은 용이 그 생각이 만든 변화를 알아봐 주는 이야기는 어떨까요?",
          evidence: "이름은 반짝나무야",
        },
        REST_FRESH,
      ],
    }),
    storybookText:
      "구름숲 한가운데에 이름 없는 나무가 새로 돋아났어요. 나무는 아무도 자기를 불러 주지 않아 시무룩했어요.\n\n민준이가 말했어요. “밤에 불 켜 주는 나무로 하자.” 그러자 나무 끝에 작은 불빛이 반짝 켜졌어요. “이름은 반짝나무야.”\n\n반짝나무는 숲의 첫 불빛이 되었어요. 숲 친구들은 반짝나무 아래 모여 포근하게 잠들었어요.",
  },
  {
    id: "mock-ep-11",
    episodeNumber: 11,
    startedAt: "2026-10-27T20:35:00+09:00",
    title: "딸기빛 빨강을 깨운 밤",
    islandTitle: "딸기 구름 계곡",
    report: mockReport({
      summary:
        "민준이는 숨은 무지개 행성에서 잠든 빨강 친구를 찾았어요. 친구와 같이 찾자고 하며 이야기 용과 계곡을 함께 걸었어요.",
      quotes: ["빨간색은 딸기 색이야", "친구랑 같이 찾으면 더 빨리 찾아"],
      choices: ["씨앗 색 중에서 빨강을 먼저 찾기로 골랐어요"],
      observations: [
        {
          inference: "“친구랑 같이 찾으면 더 빨리 찾아”라고 말했어요. 혼자보다 함께 찾는 방법을 먼저 떠올렸어요.",
          evidence: ["친구랑 같이 찾으면 더 빨리 찾아"],
        },
      ],
      line: "빨강 친구 깨울 때 무슨 말 해 줬는지 기억나?",
      teaser: "내일은 물불 행성의 두 마을이 오랜만에 만나는 날이에요.",
      weather: "sunny",
      moodNote: "“빨간색은 딸기 색이야”라며 즐겁게 이야기했어요.",
      moodEvidence: ["빨간색은 딸기 색이야"],
      keywords: [["친구", 3], ["빨강", 2]],
      planet: { id: "rainbow", planet: "숨은 무지개 행성", done: 2, total: 8, goal: "씨앗 색 하나를 찾아 깨운다", collected: ["빨강"] },
      suggestions: [PRAISE_FRESH, REST_FRESH],
    }),
    storybookText:
      "숨은 무지개 행성은 오늘도 회색빛이었어요. 일곱 색 친구들이 모두 숨어 쿨쿨 자고 있었거든요.\n\n“빨간색은 딸기 색이야.” 민준이의 말에 딸기 구름 계곡이 살짝 붉어졌어요. “친구랑 같이 찾으면 더 빨리 찾아.”\n\n민준이와 이야기 용은 나란히 계곡을 걸어 빨강 친구를 깨웠어요. 하늘에 첫 번째 색이 돌아왔어요.",
  },
  {
    id: "mock-ep-12",
    episodeNumber: 12,
    startedAt: "2026-10-28T20:50:00+09:00",
    title: "물 마을과 불 마을의 과자",
    islandTitle: "김 서린 언덕",
    report: mockReport({
      summary:
        "민준이는 물불 행성에서 서로 다른 두 마을 친구들이 처음 만나는 장면을 함께했어요. 먼저 과자를 나눠 주겠다고 하며 두 친구 사이에 다리를 놓았어요.",
      quotes: ["내가 먼저 과자 줄래. 근데 걔가 싫다고 하면 그냥 혼자 놀 거야.", "몰라", "물이랑 불이 같이 놀면 김이 나"],
      choices: ["불 마을 친구에게 먼저 과자를 나눠 주기로 골랐어요", "김 서린 언덕에서 같이 쉬기로 했어요"],
      observations: [
        {
          inference:
            "“내가 먼저 과자 줄래”라고 하면서 “싫다고 하면 그냥 혼자 놀 거야”라고도 말했어요. 먼저 다가가 보되, 거절당해도 괜찮을 방법을 함께 생각해 둔 것일 수 있어요.",
          evidence: ["내가 먼저 과자 줄래.", "싫다고 하면 그냥 혼자 놀 거야."],
        },
        {
          inference: "“물이랑 불이 같이 놀면 김이 나”라고 했어요. 서로 다른 둘이 만나면 생기는 일을 자기 말로 설명했어요.",
          evidence: ["물이랑 불이 같이 놀면 김이 나"],
        },
      ],
      line: "불 마을 친구가 과자 받았을 때 어떤 표정이었을 것 같아?",
      teaser: "내일은 모든 게 거꾸로 움직이는 별에서 비가 하늘로 올라가요.",
      weather: "partly_cloudy",
      moodNote: "처음에 “몰라”라고 하며 잠깐 망설였지만, 끝까지 자기 생각을 말했어요.",
      moodEvidence: ["몰라"],
      keywords: [["친구", 4], ["과자", 2]],
      planet: { id: "waterfire", planet: "물불 행성", done: 1, total: 6, goal: "서로 다른 두 마을 친구가 처음 만난다", collected: ["김 서린 언덕"] },
      suggestions: [
        {
          preset: "courage",
          label: "용기 북돋기",
          emoji: "🔥",
          reason:
            "“싫다고 하면 그냥 혼자 놀 거야”라고 말했어요. 내일은 용이 ‘할 수 있어용’ 하고 곁에서 믿어 주는 이야기는 어떨까요? 무서우면 돌아가도 괜찮은 이야기예요.",
          evidence: "근데 걔가 싫다고 하면 그냥 혼자 놀 거야.",
        },
        {
          preset: "company",
          label: "곁에 있어주기",
          emoji: "🤝",
          reason: "“혼자 놀 거야”라고 말했어요. 내일은 용이 처음부터 끝까지 곁에 꼭 붙어 있는 이야기는 어떨까요?",
          evidence: "그냥 혼자 놀 거야.",
        },
      ],
    }),
    storybookText:
      "물불 행성에는 물 마을과 불 마을이 있어요. 두 마을 친구들은 서로 너무 달라서 한 번도 같이 놀아 본 적이 없었어요.\n\n민준이가 말했어요. “내가 먼저 과자 줄래. 근데 걔가 싫다고 하면 그냥 혼자 놀 거야.” 불 마을 친구는 과자를 받아 들고 수줍게 웃었어요.\n\n“물이랑 불이 같이 놀면 김이 나.” 정말로 언덕 위에 하얀 김이 몽글몽글 피어올랐어요. 두 친구는 김 서린 언덕에 나란히 앉아 별을 셌어요.",
  },
  {
    id: "mock-ep-13",
    episodeNumber: 13,
    startedAt: "2026-10-29T20:30:00+09:00",
    title: "하늘로 올라가는 비",
    islandTitle: "거꾸로 우산 정원",
    report: mockReport({
      summary:
        "민준이는 거꾸로 행성에서 하늘로 올라가는 비를 만났어요. 우산을 거꾸로 들어 빗방울을 모아 구름에게 돌려줬어요.",
      quotes: ["비가 위로 가면 구름이 배부르겠다", "우산 거꾸로 들자"],
      choices: ["우산을 거꾸로 들어 빗방울 모으기를 골랐어요"],
      observations: [
        {
          inference: "“우산 거꾸로 들자”라고 했어요. 반대로 움직이는 세상에 맞춰 물건 쓰는 법도 거꾸로 바꿔 봤어요.",
          evidence: ["우산 거꾸로 들자"],
        },
      ],
      line: "비가 하늘로 올라가면 구름은 뭐라고 말할까?",
      teaser: "내일은 숨은 무지개 행성에서 두 번째 색 친구가 기다리고 있어요.",
      weather: "sunny",
      moodNote: "“구름이 배부르겠다”라며 웃으며 이야기했어요.",
      moodEvidence: ["비가 위로 가면 구름이 배부르겠다"],
      keywords: [["친구", 2], ["우산", 2]],
      planet: { id: "upside", planet: "거꾸로 행성", done: 1, total: 6, goal: "하늘로 올라가는 비를 구름에게 돌려준다", collected: ["거꾸로 우산"] },
      suggestions: [PRAISE_FRESH, REST_FRESH],
    }),
    storybookText:
      "거꾸로 행성에서는 비가 땅에서 하늘로 올라가요. 오늘은 빗방울이 너무 많이 올라가서 구름이 깜짝 놀랐어요.\n\n“비가 위로 가면 구름이 배부르겠다.” 민준이의 말에 구름이 배를 통통 두드렸어요. “우산 거꾸로 들자.”\n\n거꾸로 든 우산에 빗방울이 소복이 모였어요. 민준이는 모은 빗방울을 구름에게 살짝 돌려주었어요.",
  },
  {
    id: "mock-ep-14",
    episodeNumber: 14,
    startedAt: "2026-10-30T21:05:00+09:00",
    title: "어두운 동굴의 노랑",
    islandTitle: "반딧불 동굴",
    report: mockReport({
      summary:
        "민준이는 숨은 무지개 행성의 어두운 동굴에서 노랑 친구를 찾았어요. 이야기 용과 함께 천천히 들어가 노랑 친구를 깨웠어요.",
      quotes: ["어두운 데는 좀… 몰라, 용이 먼저 가", "노랑은 바나나 색", "같이 가면 괜찮아"],
      choices: ["이야기 용과 함께 동굴에 들어가기로 했어요", "노랑을 두 번째 색으로 골랐어요"],
      observations: [
        {
          inference:
            "“용이 먼저 가”라고 한 뒤 “같이 가면 괜찮아”라고 말했어요. 어두운 곳에서는 누군가 곁에 있을 때 한 걸음 내디딘 것처럼 보였어요.",
          evidence: ["용이 먼저 가", "같이 가면 괜찮아"],
        },
      ],
      line: "동굴에서 노랑 친구 만났을 때 제일 먼저 뭐가 보였어?",
      teaser: "내일은 구름숲에 작은 집이 생기고, 누가 살지 정하게 돼요.",
      weather: "partly_cloudy",
      moodNote: "“몰라, 용이 먼저 가”라며 잠깐 망설였지만, 용과 함께 끝까지 갔어요.",
      moodEvidence: ["몰라, 용이 먼저 가"],
      keywords: [["친구", 2], ["노랑", 2]],
      planet: { id: "rainbow", planet: "숨은 무지개 행성", done: 3, total: 8, goal: "씨앗 색 하나를 더 찾아 깨운다", collected: ["빨강", "노랑"] },
      suggestions: [
        {
          preset: "company",
          label: "곁에 있어주기",
          emoji: "🤝",
          reason: "“같이 가면 괜찮아”라고 말했어요. 내일은 용이 처음부터 끝까지 곁에 꼭 붙어 있는 이야기는 어떨까요?",
          evidence: "같이 가면 괜찮아",
        },
        PRAISE_FRESH,
      ],
    }),
    storybookText:
      "노랑 친구는 깊고 어두운 동굴 안에서 자고 있었어요. 동굴 입구에는 반딧불이 몇 마리만 깜빡이고 있었어요.\n\n“어두운 데는 좀… 몰라, 용이 먼저 가.” 이야기 용이 꼬리에 작은 불을 켰어요. 민준이가 말했어요. “같이 가면 괜찮아.”\n\n둘은 한 걸음씩 동굴 안으로 들어갔어요. “노랑은 바나나 색!” 그 말에 노랑 친구가 눈을 뜨고, 동굴이 환하게 밝아졌어요.",
  },
  {
    id: "mock-ep-15",
    episodeNumber: 15,
    startedAt: "2026-10-31T20:45:00+09:00",
    title: "고슴도치의 폭신 이불",
    islandTitle: "작은 창문 집",
    report: mockReport({
      summary:
        "민준이는 구름숲 반짝나무 아래 작은 집에 고슴도치가 살게 해 줬어요. 고슴도치가 따갑지 않게 폭신한 이불도 만들어 줬어요.",
      quotes: ["고슴도치가 폭신 이불 입으면 안 따가워", "친구들 다 초대하자"],
      choices: ["작은 집에 고슴도치가 살게 했어요", "숲 친구들을 모두 초대하기로 했어요"],
      observations: [
        {
          inference:
            "“고슴도치가 폭신 이불 입으면 안 따가워”라고 했어요. 친구가 불편하지 않을 방법부터 떠올린 것처럼 보였어요.",
          evidence: ["고슴도치가 폭신 이불 입으면 안 따가워"],
        },
      ],
      line: "고슴도치 집에 또 뭐가 있으면 좋을까?",
      teaser: "내일은 구름숲에 수줍은 새 친구가 놀러 올지도 몰라요.",
      weather: "sunny",
      moodNote: "“친구들 다 초대하자”라며 신나게 이야기했어요.",
      moodEvidence: ["친구들 다 초대하자"],
      keywords: [["친구", 3], ["이불", 2]],
      planet: { id: "forest", planet: "구름숲 행성", done: 2, total: 6, goal: "숲속 작은 집에 누가 사는지 정해 준다", collected: ["반짝나무", "작은 창문 집"] },
      suggestions: [PRAISE_FRESH, REST_FRESH],
    }),
    storybookText:
      "반짝나무 아래 작은 집의 문이 똑똑 열렸어요. 안에서 고슴도치가 빼꼼 얼굴을 내밀었어요.\n\n“고슴도치가 폭신 이불 입으면 안 따가워.” 민준이의 생각대로 구름 이불이 고슴도치를 폭 감쌌어요. “친구들 다 초대하자.”\n\n작은 창문 집에 숲 친구들이 하나둘 모였어요. 창가 불빛이 포근하게 깜빡이는 사이, 모두 사르르 잠들었어요.",
  },
];
