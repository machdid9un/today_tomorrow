// 턴 생성에 필요한 회차 맥락 읽기/쓰기. 소유: 역할 3.
// - Supabase 환경변수가 있고 episodeId가 "mock"으로 시작하지 않으면 DB 사용
// - 그 외(로컬 테스트, 역할 1 API 미완성)에는 서버 메모리에 임시 저장
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";
import type { SeedPreset, StoryMemory } from "@/types";

export interface TurnRecord {
  childText: string;
  narration: string;
}

export interface EpisodeContext {
  source: "db" | "memory";
  episodeId: string;
  worldId: string | null;
  episodeNumber: number;
  startedAt: number; // epoch ms
  childName: string | null;
  childAge: number | null;
  memory: StoryMemory | null;
  seedPreset: SeedPreset | null;
  seedText: string | null;
  history: TurnRecord[];
}

export interface SaveTurnInput {
  turnIndex: number;
  childText: string;
  narration: string;
  choices: string[];
  prevLatencyMs: number | null;
  childName: string | null;
}

const SEED_PRESETS: SeedPreset[] = ["friend", "school", "sibling", "fear", "new_place", "custom"];

type MemoryStore = Map<string, EpisodeContext>;
interface MockWorld {
  memory: StoryMemory | null;
  childName: string | null;
  episodeCount: number;
}
const globalForStore = globalThis as unknown as {
  __storyMemoryStore?: MemoryStore;
  __storyMockWorlds?: Map<string, MockWorld>;
};
const memoryStore: MemoryStore =
  globalForStore.__storyMemoryStore ?? (globalForStore.__storyMemoryStore = new Map());
/** 메모리 모드에서 회차를 이어가기 위한 가짜 세계. "mock-real1", "mock-real2"는 같은 세계 "mock-real". */
const mockWorlds: Map<string, MockWorld> =
  globalForStore.__storyMockWorlds ?? (globalForStore.__storyMockWorlds = new Map());

function mockWorldKey(episodeId: string): string {
  return episodeId.replace(/\d+$/, "") || episodeId;
}

function useDb(episodeId: string): boolean {
  return (
    !episodeId.startsWith("mock") &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** memory_json(기본값 '{}')을 StoryMemory로 정규화. 내용이 없으면 null. */
export function normalizeMemory(raw: unknown): StoryMemory | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const memory: StoryMemory = {
    characters: toStringArray(r.characters),
    items: toStringArray(r.items),
    places: toStringArray(r.places),
    keyEvents: toStringArray(r.keyEvents),
    nextHook: typeof r.nextHook === "string" ? r.nextHook : "",
  };
  const empty =
    !memory.characters.length &&
    !memory.items.length &&
    !memory.places.length &&
    !memory.keyEvents.length &&
    !memory.nextHook;
  return empty ? null : memory;
}

function toSeedPreset(v: unknown): SeedPreset | null {
  return typeof v === "string" && (SEED_PRESETS as string[]).includes(v) ? (v as SeedPreset) : null;
}

export async function loadEpisodeContext(episodeId: string): Promise<EpisodeContext> {
  if (!useDb(episodeId)) {
    const existing = memoryStore.get(episodeId);
    if (existing) return existing;
    const world = mockWorlds.get(mockWorldKey(episodeId));
    const created: EpisodeContext = {
      source: "memory",
      episodeId,
      worldId: null,
      episodeNumber: (world?.episodeCount ?? 0) + 1,
      startedAt: Date.now(),
      childName: world?.childName ?? null,
      childAge: null,
      memory: world?.memory ?? null,
      seedPreset: "friend", // 로컬 테스트용: 씨앗 장면이 나오는지 확인
      seedText: null,
      history: [],
    };
    memoryStore.set(episodeId, created);
    return created;
  }

  const sb = getSupabaseServerClient();

  const { data: ep, error: epErr } = await sb
    .from("episodes")
    .select("id, world_id, episode_number, started_at")
    .eq("id", episodeId)
    .single();
  if (epErr || !ep) throw new Error(`EPISODE_NOT_FOUND: ${episodeId}`);

  const { data: world } = await sb
    .from("worlds")
    .select("child_name, child_age, memory_json, next_seed_preset, next_seed_text")
    .eq("id", ep.world_id)
    .single();

  const { data: turns } = await sb
    .from("turns")
    .select("turn_index, child_text, narration")
    .eq("episode_id", episodeId)
    .order("turn_index", { ascending: true });

  return {
    source: "db",
    episodeId,
    worldId: ep.world_id ?? null,
    episodeNumber: ep.episode_number ?? 1,
    startedAt: ep.started_at ? new Date(ep.started_at).getTime() : Date.now(),
    childName: world?.child_name ?? null,
    childAge: world?.child_age ?? null,
    memory: normalizeMemory(world?.memory_json),
    seedPreset: toSeedPreset(world?.next_seed_preset),
    seedText: world?.next_seed_text ?? null,
    history: (turns ?? []).map((t: { child_text: string | null; narration: string | null }) => ({
      childText: t.child_text ?? "",
      narration: t.narration ?? "",
    })),
  };
}

/**
 * 메모리 모드 전용: 회차 종료 결과를 가짜 세계에 반영해 다음 회차("mock-real2")가 기억을 이어받게 한다.
 * DB 모드에서는 아무것도 하지 않는다(저장은 역할 1의 /api/episodes/[id]/complete 담당).
 */
export function saveMockWorld(
  ctx: EpisodeContext,
  result: { worldMemory: StoryMemory; childName: string | null }
): void {
  if (ctx.source !== "memory") return;
  const key = mockWorldKey(ctx.episodeId);
  const prev = mockWorlds.get(key);
  mockWorlds.set(key, {
    memory: result.worldMemory,
    childName: result.childName ?? ctx.childName ?? prev?.childName ?? null,
    episodeCount: Math.max(prev?.episodeCount ?? 0, ctx.episodeNumber),
  });
}

/** 턴 기록 저장. 실패해도 예외를 던지지 않는다(이미 아이에게 응답은 나간 상태). */
export async function saveTurn(ctx: EpisodeContext, input: SaveTurnInput): Promise<void> {
  if (ctx.source === "memory") {
    ctx.history.push({ childText: input.childText, narration: input.narration });
    if (input.childName && !ctx.childName) ctx.childName = input.childName;
    return;
  }

  try {
    const sb = getSupabaseServerClient();

    const { error } = await sb.from("turns").insert({
      episode_id: ctx.episodeId,
      turn_index: input.turnIndex,
      child_text: input.childText,
      narration: input.narration,
      choices_json: input.choices,
    });
    if (error) console.error("[story] turn insert failed", error);

    if (input.prevLatencyMs !== null && input.turnIndex > 0) {
      await sb
        .from("turns")
        .update({ latency_ms: Math.round(input.prevLatencyMs) })
        .eq("episode_id", ctx.episodeId)
        .eq("turn_index", input.turnIndex - 1);
    }

    if (input.childName && !ctx.childName && ctx.worldId) {
      await sb.from("worlds").update({ child_name: input.childName }).eq("id", ctx.worldId);
    }
  } catch (err) {
    console.error("[story] saveTurn failed", err);
  }
}
