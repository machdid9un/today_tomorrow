"use client";
// 부모 화면 데이터 공급자. 소유: 역할 4.
// /parent 아래 페이지들(마음 리포트·이야기 기록·설정)이 한 번 불러온 데이터를 함께 쓴다.
// 1) GET /api/episodes?worldId= 가 응답하면 실제 데이터, 2) 아니면(501·오류·시간 초과) 예시 데이터.
// worldId는 ?worldId= 쿼리로 받고, 다음 방문을 위해 이 기기에만 기억한다. ?mock=1이면 항상 예시 데이터.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchChildFromApi,
  fetchEpisodeDetail,
  fetchWorldIdForEpisode,
  mockChildren,
  MOCK_TODAY,
  type ChildProfile,
  type DataSource,
  type ParentEpisode,
} from "./parentData";

const WORLD_KEY = "sangsang.parent.worldId";
const CHILD_KEY = "sangsang.parent.child";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 사생활 보호 모드 등: 기억하지 못해도 화면은 그대로 */
  }
}

export interface ParentDataValue {
  status: "loading" | "ready";
  source: DataSource;
  children: ChildProfile[];
  activeChild: ChildProfile | null;
  selectChild: (key: string) => void;
  /** 주간 리포트 기준 시각 (예시 데이터면 시안과 같은 날) */
  today: string;
  /** THEMES의 행성 이름 (id → 이름) */
  planetNames: Record<string, string>;
  findEpisode: (id: string) => ParentEpisode | null;
  /** 상세 API로 리포트·동화책을 채운다 (예시 데이터면 그대로). 실패하면 null */
  loadEpisodeDetail: (id: string) => Promise<ParentEpisode | null>;
  /** 마음 담기 저장 후 화면에 반영 */
  setSavedSeed: (childKey: string, preset: ChildProfile["savedSeed"]) => void;
}

const ParentDataContext = createContext<ParentDataValue | null>(null);

export function useParentData(): ParentDataValue {
  const v = useContext(ParentDataContext);
  if (!v) throw new Error("useParentData must be used inside <ParentDataProvider>");
  return v;
}

export default function ParentDataProvider({
  planetNames,
  children: content,
}: {
  planetNames: Record<string, string>;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [source, setSource] = useState<DataSource>("mock");
  const [kids, setKids] = useState<ChildProfile[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [today, setToday] = useState<string>(MOCK_TODAY);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const forceMock = params.get("mock") === "1";
    const urlWorld = params.get("worldId");
    const urlEpisode = params.get("ep");
    if (urlWorld) writeStorage(WORLD_KEY, urlWorld);

    (async () => {
      let worldId = urlWorld || readStorage(WORLD_KEY);
      // 건네주기 화면이 worldId를 못 넘긴 경우(예: 클라이언트 타이밍 문제)에도, ep(episodeId)는
      // 항상 있으니 그걸로 회차를 조회해 world_id를 역추적한다(GET /api/episodes/[id]).
      if (!worldId && urlEpisode && !forceMock) {
        worldId = await fetchWorldIdForEpisode(urlEpisode, ctrl.signal);
        if (ctrl.signal.aborted) return;
        if (worldId) writeStorage(WORLD_KEY, worldId);
      }
      const real = forceMock ? null : await fetchChildFromApi(worldId, ctrl.signal);
      if (ctrl.signal.aborted) return;
      const list = real ? [real] : mockChildren();
      const remembered = readStorage(CHILD_KEY);
      setKids(list);
      setSource(real ? "api" : "mock");
      setToday(real ? new Date().toISOString() : MOCK_TODAY);
      setActiveKey(list.find((c) => c.key === remembered)?.key ?? list[0]?.key ?? null);
      setStatus("ready");
    })();
    return () => ctrl.abort();
  }, []);

  const selectChild = useCallback((key: string) => {
    setActiveKey(key);
    writeStorage(CHILD_KEY, key);
  }, []);

  const findEpisode = useCallback(
    (id: string) => {
      for (const c of kids) {
        const e = c.episodes.find((x) => x.id === id);
        if (e) return e;
      }
      return null;
    },
    [kids]
  );

  const loadEpisodeDetail = useCallback(
    async (id: string) => {
      const existing = findEpisode(id);
      if (source === "mock") return existing;
      const detail = await fetchEpisodeDetail(id);
      if (!detail) return null;
      const merged: ParentEpisode = existing
        ? {
            ...existing,
            report: detail.report ?? existing.report,
            storybookText: detail.storybookText ?? existing.storybookText,
            title: detail.title ?? existing.title,
            islandTitle: detail.islandTitle ?? existing.islandTitle,
          }
        : detail;
      setKids((prev) =>
        prev.map((c) =>
          c.episodes.some((e) => e.id === id)
            ? { ...c, episodes: c.episodes.map((e) => (e.id === id ? merged : e)) }
            : c
        )
      );
      return merged;
    },
    [findEpisode, source]
  );

  const setSavedSeed = useCallback((childKey: string, preset: ChildProfile["savedSeed"]) => {
    setKids((prev) => prev.map((c) => (c.key === childKey ? { ...c, savedSeed: preset } : c)));
  }, []);

  const value = useMemo<ParentDataValue>(
    () => ({
      status,
      source,
      children: kids,
      activeChild: kids.find((c) => c.key === activeKey) ?? null,
      selectChild,
      today,
      planetNames,
      findEpisode,
      loadEpisodeDetail,
      setSavedSeed,
    }),
    [status, source, kids, activeKey, selectChild, today, planetNames, findEpisode, loadEpisodeDetail, setSavedSeed]
  );

  return <ParentDataContext.Provider value={value}>{content}</ParentDataContext.Provider>;
}
