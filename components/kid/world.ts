// 별 안의 장소 데이터 (DB 이름은 island_title 그대로, 뜻은 "별 안의 장소" — README §0). 소유: 역할 4.
// GET /api/episodes?worldId= 응답 형태는 역할 1 확정 전 가정값. 확정되면 toIsland()만 맞추면 됨.

export interface Island {
  id: string;
  episodeNumber: number;
  islandTitle: string;
}

export type WorldState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "full"; islands: Island[]; sample: boolean };

export const WORLD_ID_KEY = "sangsang.worldId";

// 피칭 백업용 샘플 세계 (README §9: 화면에 "샘플" 표시)
export const SAMPLE_ISLANDS: Island[] = [
  { id: "sample-1", episodeNumber: 1, islandTitle: "뿌뿌나무 언덕" },
  { id: "sample-2", episodeNumber: 2, islandTitle: "김구름 다리" },
  { id: "sample-3", episodeNumber: 3, islandTitle: "거꾸로 우체통" },
  { id: "sample-4", episodeNumber: 4, islandTitle: "초록 꽃밭" },
];

export function readWorldId(): string | null {
  try {
    return window.localStorage.getItem(WORLD_ID_KEY);
  } catch {
    return null;
  }
}

export function saveWorldId(worldId: string) {
  try {
    window.localStorage.setItem(WORLD_ID_KEY, worldId);
  } catch {
    // 저장이 막혀도 쿠키로 서버가 이어감
  }
}

interface EpisodeListItem {
  id: string;
  episode_number?: number;
  episodeNumber?: number;
  island_title?: string | null;
  islandTitle?: string | null;
  status?: string;
}

function toIsland(e: EpisodeListItem): Island | null {
  if (e.status && e.status !== "completed") return null;
  const n = e.episodeNumber ?? e.episode_number ?? 0;
  const title = e.islandTitle ?? e.island_title ?? `${n}화의 장소`;
  return { id: e.id, episodeNumber: n, islandTitle: title };
}

export async function loadWorld(demo: boolean): Promise<WorldState> {
  if (demo) return { status: "full", islands: SAMPLE_ISLANDS, sample: true };
  const worldId = readWorldId();
  if (!worldId) return { status: "empty" };
  try {
    const res = await fetch(`/api/episodes?worldId=${encodeURIComponent(worldId)}`, {
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 501) return { status: "empty" };
    if (!res.ok) return { status: "error" };
    const body = (await res.json()) as { episodes?: EpisodeListItem[] } | EpisodeListItem[];
    const list = Array.isArray(body) ? body : body.episodes ?? [];
    const islands = list
      .map(toIsland)
      .filter((i): i is Island => i !== null)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
    return islands.length ? { status: "full", islands, sample: false } : { status: "empty" };
  } catch {
    return { status: "error" };
  }
}
