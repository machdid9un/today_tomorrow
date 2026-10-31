// 부모 화면 데이터: API 응답 정리 + 예시 데이터. 소유: 역할 4.
// API(역할 1)가 아직 501이거나 응답 모양이 조금 달라도 화면이 깨지지 않게, camelCase·snake_case를 모두 받는다.
// 클라이언트 전용 모듈에서도 쓰므로 lib/story는 '타입만' 가져오거나 순수 모듈(weeklyReport)만 가져온다.
import type { SeedPreset } from "@/types";
import type { MoodWeather, Observation, ParentReportOut } from "@/lib/story/reportGenerator";
import type { SeedSuggestion } from "@/lib/story/seedRecommend";
import {
  isMoodWeather,
  MOCK_CHILD,
  MOCK_EPISODES,
  MOCK_TODAY,
  mockReport,
  type WeeklyEpisodeInput,
} from "@/lib/story/weeklyReport";

export type DataSource = "api" | "mock" | "empty";

export interface ParentEpisode extends WeeklyEpisodeInput {
  status: string | null;
  storybookText: string | null;
}

export interface ChildProfile {
  /** worldId 또는 예시 키 */
  key: string;
  name: string | null;
  /** "2학년" / "7살" */
  ageLabel: string | null;
  /** 예시 데이터면 null (저장 API를 부를 수 없음) */
  worldId: string | null;
  /** 지금 담겨 있는 마음 (worlds.next_seed_preset), 모르면 null */
  savedSeed: SeedPreset | null;
  episodes: ParentEpisode[];
}

export interface SeedOptionCopy {
  preset: Exclude<SeedPreset, "custom">;
  label: string;
  desc: string;
}

export interface SeedSectionCopy {
  title: string;
  /** {name} 자리에 아이 이름 */
  body: string;
  cta: string;
  options: SeedOptionCopy[];
}

// ───────────────────────── 값 정리 도우미 ─────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter((s): s is string => s !== null) : [];
const pick = (o: Obj, ...keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

const SEED_PRESETS: SeedPreset[] = ["courage", "praise", "company", "rest", "custom"];
const asSeed = (v: unknown): SeedPreset | null =>
  typeof v === "string" && (SEED_PRESETS as string[]).includes(v) ? (v as SeedPreset) : null;

/** report_json → ParentReportOut (빠진 칸은 비워서) */
export function normalizeReport(raw: unknown): ParentReportOut | null {
  const r = typeof raw === "string" ? safeJson(raw) : raw;
  if (!isObj(r)) return null;
  const summary = str(r.summary);
  const childQuotes = strList(r.childQuotes);
  if (!summary && !childQuotes.length) return null;

  const observations: Observation[] = (Array.isArray(r.observations) ? r.observations : [])
    .filter(isObj)
    .map((o) => ({ inference: str(o.inference) ?? "", evidence: strList(o.evidence) }))
    .filter((o) => o.inference);

  const keywords = (Array.isArray(r.keywords) ? r.keywords : [])
    .filter(isObj)
    .map((k) => ({ word: str(k.word) ?? "", count: num(k.count) ?? 0 }))
    .filter((k) => k.word && k.count > 0);

  let planet: ParentReportOut["planet"];
  if (isObj(r.planet)) {
    const total = num(r.planet.total);
    const name = str(r.planet.planet);
    if (total && name) {
      planet = {
        id: str(r.planet.id) ?? "",
        planet: name,
        done: Math.max(0, Math.min(num(r.planet.done) ?? 0, total)),
        total,
        goal: str(r.planet.goal) ?? "",
        collected: strList(r.planet.collected),
      };
    }
  }

  const seedSuggestions: SeedSuggestion[] = (Array.isArray(r.seedSuggestions) ? r.seedSuggestions : [])
    .filter(isObj)
    .map((s) => {
      const preset = asSeed(s.preset);
      if (!preset || preset === "custom") return null;
      return {
        preset,
        label: str(s.label) ?? "",
        emoji: str(s.emoji) ?? "",
        reason: str(s.reason) ?? "",
        evidence: str(s.evidence),
      };
    })
    .filter((s): s is SeedSuggestion => s !== null && Boolean(s.reason));

  const moodWeather: MoodWeather | undefined = isMoodWeather(r.moodWeather) ? r.moodWeather : undefined;

  // 담아 둔 마음이 어떻게 전해졌나 (PR #15). label·note가 있어야 카드가 뜬다.
  let seedEcho: ParentReportOut["seedEcho"];
  if (isObj(r.seedEcho)) {
    const label = str(r.seedEcho.label);
    const note = str(r.seedEcho.note);
    if (label && note) seedEcho = { label, note, dragonLine: str(r.seedEcho.dragonLine), childQuote: str(r.seedEcho.childQuote) };
  }

  return {
    summary: summary ?? "",
    childQuotes,
    childChoices: strList(r.childChoices),
    observations,
    observation: str(r.observation) ?? observations.map((o) => o.inference).join(" "),
    lineForParent: str(r.lineForParent) ?? "",
    safetyFlags: strList(r.safetyFlags),
    nextEpisodeTeaser: str(r.nextEpisodeTeaser) ?? "",
    moodWeather,
    moodNote: str(r.moodNote) ?? undefined,
    moodEvidence: strList(r.moodEvidence),
    keywords,
    planet,
    seedSuggestions,
    ...(seedEcho ? { seedEcho } : {}),
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** episodes 행(또는 API 응답 항목) → ParentEpisode */
export function normalizeEpisode(raw: unknown): ParentEpisode | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  const startedAt = str(pick(raw, "startedAt", "started_at", "createdAt", "created_at")) ?? "";
  return {
    id,
    episodeNumber: num(pick(raw, "episodeNumber", "episode_number", "number")) ?? 0,
    startedAt,
    title: str(raw.title),
    islandTitle: str(pick(raw, "islandTitle", "island_title")),
    status: str(raw.status),
    storybookText: str(pick(raw, "storybookText", "storybook_text", "storybook")),
    report: normalizeReport(pick(raw, "report", "reportJson", "report_json")),
  };
}

/** 보여 줄 회차인가 (진행 중이고 아무 결과도 없는 회차는 뺀다) */
const isShowable = (e: ParentEpisode) =>
  Boolean(e.startedAt) && (e.status === "completed" || e.report !== null || e.storybookText !== null);

export function ageLabelOf(age: unknown): string | null {
  const n = num(age);
  return n && n > 0 && n < 20 ? `${Math.round(n)}살` : null;
}

/** GET /api/episodes 응답 → ChildProfile. 모양을 알아볼 수 없으면 null (= 예시 데이터로). */
export function normalizeEpisodeList(json: unknown, requestedWorldId: string | null): ChildProfile | null {
  const root: Obj = isObj(json) ? json : { episodes: json };
  const list = pick(root, "episodes", "data", "items");
  if (!Array.isArray(list)) return null;
  const world = isObj(root.world) ? root.world : {};
  const child = isObj(root.child) ? root.child : {};
  const episodes = list
    .map(normalizeEpisode)
    .filter((e): e is ParentEpisode => e !== null && isShowable(e))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const firstRow = list.find(isObj);
  const worldId =
    str(pick(root, "worldId", "world_id")) ??
    str(world.id) ??
    requestedWorldId ??
    (firstRow ? str(pick(firstRow, "worldId", "world_id")) : null);
  return {
    key: worldId ?? "api",
    name: str(pick(root, "childName", "child_name")) ?? str(world.child_name) ?? str(child.name),
    ageLabel: ageLabelOf(pick(root, "childAge", "child_age") ?? world.child_age ?? child.age),
    worldId,
    savedSeed: asSeed(pick(root, "nextSeedPreset", "next_seed_preset") ?? world.next_seed_preset),
    episodes,
  };
}

// ───────────────────────── API 호출 ─────────────────────────

const TIMEOUT_MS = 6000;

async function getJson(url: string, signal?: AbortSignal): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** GET /api/episodes?worldId=&mode=parent (역할 1). 실패·미구현(501)이면 null. */
export async function fetchChildFromApi(worldId: string | null, signal?: AbortSignal): Promise<ChildProfile | null> {
  const url = worldId
    ? `/api/episodes?worldId=${encodeURIComponent(worldId)}&mode=parent`
    : "/api/episodes?mode=parent";
  const json = await getJson(url, signal);
  return json === null ? null : normalizeEpisodeList(json, worldId);
}

/** GET /api/episodes/[id]?mode=parent (역할 1). 리포트·동화책이 목록에 없을 때 채운다. */
export async function fetchEpisodeDetail(id: string, signal?: AbortSignal): Promise<ParentEpisode | null> {
  const json = await getJson(`/api/episodes/${encodeURIComponent(id)}?mode=parent`, signal);
  if (!isObj(json)) return null;
  return normalizeEpisode(isObj(json.episode) ? { ...json, ...json.episode } : json);
}

/**
 * URL에 worldId는 없고 ep(episodeId)만 있을 때를 위한 안전장치.
 * 건네주기 화면이 worldId를 못 넘긴 경우에도, ep로 회차를 조회해 world_id를 역추적한다.
 */
export async function fetchWorldIdForEpisode(episodeId: string, signal?: AbortSignal): Promise<string | null> {
  const json = await getJson(`/api/episodes/${encodeURIComponent(episodeId)}`, signal);
  if (!isObj(json)) return null;
  const episode = isObj(json.episode) ? json.episode : json;
  return str(pick(episode, "worldId", "world_id"));
}

/** PATCH /api/sessions/[worldId]/seed { preset } (역할 1). 성공하면 true. */
export async function saveSeedPreset(worldId: string, preset: SeedPreset | null): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(worldId)}/seed`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ preset }),
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ───────────────────────── 예시 데이터 ─────────────────────────

export { MOCK_TODAY };

const SEOA_EPISODES: ParentEpisode[] = [
  {
    id: "mock-seoa-3",
    episodeNumber: 3,
    startedAt: "2026-10-26T20:20:00+09:00",
    title: "구름양의 이름",
    islandTitle: "몽실 언덕",
    status: "completed",
    report: mockReport({
      summary: "서아는 구름숲에서 만난 구름양에게 이름을 지어 줬어요. 이름을 고르기 전에 잠깐 고민하다가 ‘몽실이’로 정했어요.",
      quotes: ["음… 몰라, 몽실이?", "몽실이는 폭신해서 베개 해도 돼"],
      choices: ["구름양 이름을 ‘몽실이’로 지었어요"],
      observations: [
        {
          inference: "“몽실이는 폭신해서 베개 해도 돼”라고 했어요. 이름을 지은 뒤 그 친구와 함께할 방법까지 떠올렸어요.",
          evidence: ["몽실이는 폭신해서 베개 해도 돼"],
        },
      ],
      line: "몽실이 베개는 어떤 느낌일까?",
      teaser: "내일은 숨은 무지개 행성에서 잠든 색깔 친구를 찾아요.",
      weather: "partly_cloudy",
      moodNote: "“몰라”라고 하며 잠깐 고민했지만 직접 이름을 정했어요.",
      moodEvidence: ["음… 몰라, 몽실이?"],
      keywords: [["몽실이", 2]],
      planet: { id: "forest", planet: "구름숲 행성", done: 1, total: 6, goal: "새 친구에게 이름을 지어 준다", collected: ["몽실이"] },
      suggestions: [],
    }),
    storybookText:
      "구름숲 언덕 위에 폭신한 구름양 한 마리가 있었어요. 구름양은 아직 이름이 없었어요.\n\n“음… 몰라, 몽실이?” 서아의 말에 구름양이 몽실몽실 웃었어요. 그날 밤, 몽실이는 서아의 폭신한 베개가 되어 주었어요.",
  },
  {
    id: "mock-seoa-4",
    episodeNumber: 4,
    startedAt: "2026-10-27T20:10:00+09:00",
    title: "어두운 굴의 파랑",
    islandTitle: "파란 굴",
    status: "completed",
    report: mockReport({
      summary: "서아는 숨은 무지개 행성의 어두운 굴에서 파랑 친구를 찾았어요. 어두운 게 무섭다고 말했고, 이야기 용이 등불을 켜 함께 들어갔어요.",
      quotes: ["어두운 게 무서워", "용이 손 잡아 줘", "파랑은 바다 색이야"],
      choices: ["이야기 용과 손잡고 굴에 들어가기로 했어요"],
      observations: [
        {
          inference: "“어두운 게 무서워”라고 말한 뒤 “용이 손 잡아 줘”라고 했어요. 무서운 마음을 말로 꺼내고, 함께 갈 방법을 직접 찾았어요.",
          evidence: ["어두운 게 무서워", "용이 손 잡아 줘"],
        },
      ],
      line: "파랑 친구 만났을 때 굴 안은 어떤 색이었어?",
      teaser: "내일은 물불 행성의 두 마을에 놀러 가요.",
      weather: "rainy",
      moodNote: "“어두운 게 무서워”라고 마음을 말한 순간이 있었어요.",
      moodEvidence: ["어두운 게 무서워"],
      keywords: [["파랑", 2]],
      planet: { id: "rainbow", planet: "숨은 무지개 행성", done: 2, total: 8, goal: "씨앗 색 하나를 찾아 깨운다", collected: ["파랑"] },
      suggestions: [
        {
          preset: "courage",
          label: "용기 북돋기",
          emoji: "🔥",
          reason: "“어두운 게 무서워”라고 말했어요. 내일은 용이 ‘할 수 있어용’ 하고 곁에서 믿어 주는 이야기는 어떨까요? 무서우면 돌아가도 괜찮은 이야기예요.",
          evidence: "어두운 게 무서워",
        },
        {
          preset: "company",
          label: "곁에 있어주기",
          emoji: "🤝",
          reason: "“용이 손 잡아 줘”라고 말했어요. 내일은 용이 처음부터 끝까지 곁에 꼭 붙어 있는 이야기는 어떨까요?",
          evidence: "용이 손 잡아 줘",
        },
      ],
    }),
    storybookText:
      "파랑 친구는 깊고 어두운 굴 안에서 자고 있었어요. “어두운 게 무서워.” 서아가 작게 말했어요.\n\n“용이 손 잡아 줘.” 이야기 용은 꼬리 등불을 켜고 서아의 손을 꼭 잡았어요. 둘이 함께 들어가자 굴 안이 바다처럼 파랗게 빛났어요.",
  },
  {
    id: "mock-seoa-5",
    episodeNumber: 5,
    startedAt: "2026-10-29T20:15:00+09:00",
    title: "김이 피어오르는 다리",
    islandTitle: "몽글 다리",
    status: "completed",
    report: mockReport({
      summary: "서아는 물불 행성에서 물 마을과 불 마을 사이에 김 다리를 놓았어요. 두 마을 친구들이 다리 위에서 처음 인사했어요.",
      quotes: ["물이랑 불이 만나면 몽글몽글해", "다 같이 건너자"],
      choices: ["두 마을 사이에 김 다리를 놓기로 골랐어요"],
      observations: [
        {
          inference: "“다 같이 건너자”라고 했어요. 두 마을 친구들이 함께할 방법을 먼저 떠올렸어요.",
          evidence: ["다 같이 건너자"],
        },
      ],
      line: "몽글 다리 위에서 친구들이 무슨 인사를 했을까?",
      teaser: "내일은 거꾸로 행성에서 비가 하늘로 올라가요.",
      weather: "partly_cloudy",
      moodNote: "“다 같이 건너자”라며 차분하게 이야기를 이어 갔어요.",
      moodEvidence: ["다 같이 건너자"],
      keywords: [["다리", 2]],
      planet: { id: "waterfire", planet: "물불 행성", done: 1, total: 6, goal: "두 마을 사이에 다리를 놓는다", collected: ["몽글 다리"] },
      suggestions: [],
    }),
    storybookText:
      "물불 행성의 물 마을과 불 마을 사이에는 넓은 골짜기가 있었어요.\n\n“물이랑 불이 만나면 몽글몽글해.” 서아의 말처럼 골짜기 위로 하얀 김 다리가 피어올랐어요. “다 같이 건너자!” 두 마을 친구들은 다리 위에서 처음으로 손을 흔들었어요.",
  },
];

/** 예시 아이 둘: 민준(2학년, 6화) · 서아(7살, 3화) */
export function mockChildren(): ChildProfile[] {
  return [
    {
      key: "mock-minjun",
      name: MOCK_CHILD.name,
      ageLabel: MOCK_CHILD.ageLabel,
      worldId: null,
      savedSeed: null,
      episodes: MOCK_EPISODES.map((e) => ({ ...e, status: "completed" })),
    },
    {
      key: "mock-seoa",
      name: "서아",
      ageLabel: "7살",
      worldId: null,
      savedSeed: null,
      episodes: SEOA_EPISODES,
    },
  ];
}
