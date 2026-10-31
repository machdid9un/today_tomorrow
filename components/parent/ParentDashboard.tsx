"use client";
// 마음 리포트 화면: [주간 | 하루씩 보기] 탭. 소유: 역할 4.
// 주간 = 마음 날씨 카드 + 이런 모습이 보였어요 + 내일 이야기에 마음 담기
// 하루씩 보기 = 한 회차 리포트 (이전/다음 이야기로 넘기기)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWeeklyReport, nightOf } from "@/lib/story/weeklyReport";
import DailyLog from "./DailyLog";
import { ChevronLeft, ChevronRight } from "./icons";
import { useParentData } from "./ParentDataProvider";
import type { ParentEpisode, SeedSectionCopy } from "./parentData";
import SeedSelector, { type SeedOption } from "./SeedSelector";
import { Card, CardTitle, focusRing, LoadingCards } from "./ui";
import WeeklyHighlights from "./WeeklyHighlights";
import WeeklyMoodCard from "./WeeklyMoodCard";

export type DashboardView = "weekly" | "daily";

export interface ParentDashboardProps {
  seedCopy: SeedSectionCopy;
  initialView?: DashboardView;
  initialEpisodeId?: string | null;
}

const TABS: { id: DashboardView; label: string }[] = [
  { id: "weekly", label: "주간" },
  { id: "daily", label: "하루씩 보기" },
];

export default function ParentDashboard({ seedCopy, initialView = "weekly", initialEpisodeId = null }: ParentDashboardProps) {
  const { status, source, activeChild, today, planetNames, loadEpisodeDetail } = useParentData();
  const [view, setView] = useState<DashboardView>(initialView);
  const [episodeId, setEpisodeId] = useState<string | null>(initialEpisodeId);
  const [seedSel, setSeedSel] = useState<SeedOption | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const tried = useRef(new Set<string>());
  const tabRefs = useRef<Record<DashboardView, HTMLButtonElement | null>>({ weekly: null, daily: null });

  // 아이가 바뀌면 그 아이에게 담긴 마음으로 되돌린다
  const childKey = activeChild?.key ?? null;
  useEffect(() => {
    setSeedSel(activeChild?.savedSeed && activeChild.savedSeed !== "custom" ? activeChild.savedSeed : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childKey]);

  const episodes = useMemo<ParentEpisode[]>(
    () => [...(activeChild?.episodes ?? [])].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)),
    [activeChild]
  );

  const weekly = useMemo(
    () => (activeChild ? buildWeeklyReport(episodes, { childName: activeChild.name, today }) : null),
    [activeChild, episodes, today]
  );

  const selected = useMemo<ParentEpisode | null>(() => {
    if (!episodes.length) return null;
    const hit = episodeId ? episodes.find((e) => e.id === episodeId) : undefined;
    if (hit) return hit;
    const withReport = episodes.filter((e) => e.report);
    return (withReport.length ? withReport : episodes)[(withReport.length ? withReport : episodes).length - 1];
  }, [episodes, episodeId]);

  // 목록에 리포트가 없으면 상세 API로 한 번 채워 본다
  useEffect(() => {
    if (view !== "daily" || !selected || selected.report || source !== "api" || tried.current.has(selected.id)) return;
    tried.current.add(selected.id);
    setDetailLoading(true);
    loadEpisodeDetail(selected.id).finally(() => setDetailLoading(false));
  }, [view, selected, source, loadEpisodeDetail]);

  // 새로 고침해도 같은 화면이 보이게 주소에 남긴다 (?view=daily&ep=…)
  useEffect(() => {
    if (status !== "ready") return;
    const url = new URL(window.location.href);
    if (view === "daily") {
      url.searchParams.set("view", "daily");
      if (selected) url.searchParams.set("ep", selected.id);
    } else {
      url.searchParams.delete("view");
      url.searchParams.delete("ep");
    }
    window.history.replaceState(window.history.state, "", url.toString());
  }, [status, view, selected]);

  const switchTo = useCallback((v: DashboardView, focus = false) => {
    setView(v);
    if (focus) tabRefs.current[v]?.focus();
  }, []);

  const openDay = useCallback((id: string) => {
    setEpisodeId(id);
    setView("daily");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pickSeed = useCallback((preset: SeedOption) => {
    setSeedSel(preset);
    setView("weekly");
    window.requestAnimationFrame(() =>
      document.getElementById("seed-title")?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
  }, []);

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const next: DashboardView =
        e.key === "Home" ? "weekly" : e.key === "End" ? "daily" : view === "weekly" ? "daily" : "weekly";
      switchTo(next, true);
    }
  };

  const index = selected ? episodes.findIndex((e) => e.id === selected.id) : -1;
  const older = index > 0 ? episodes[index - 1] : null;
  const newer = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;

  return (
    <div className="space-y-4 pt-1">
      <div role="tablist" aria-label="리포트 보기 방식" onKeyDown={onTabKey} className="grid grid-cols-2 gap-1 rounded-[20px] bg-[#f2e3cc] p-1">
        {TABS.map((t) => {
          const on = view === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => switchTo(t.id)}
              className={`min-h-[44px] rounded-[15px] text-[15px] transition ${
                on ? "bg-[#fffaf2] font-bold text-[#20213d] shadow-[0_1px_3px_rgba(32,33,61,0.10)]" : "font-medium text-[#565073]"
              } ${focusRing}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="panel-weekly" aria-labelledby="tab-weekly" hidden={view !== "weekly"} className="space-y-4">
        {status === "loading" || !activeChild || !weekly ? (
          <LoadingCards />
        ) : (
          <>
            <WeeklyMoodCard report={weekly} onOpenDay={openDay} />
            <WeeklyHighlights report={weekly} childName={activeChild.name} />
            <SeedSelector
              copy={seedCopy}
              child={activeChild}
              isMock={source === "mock"}
              selected={seedSel}
              onSelectedChange={setSeedSel}
            />
          </>
        )}
      </div>

      <div role="tabpanel" id="panel-daily" aria-labelledby="tab-daily" hidden={view !== "daily"} className="space-y-4">
        {status === "loading" || !activeChild ? (
          <LoadingCards />
        ) : !selected ? (
          <Card>
            <CardTitle>아직 완성된 이야기가 없어요</CardTitle>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#565073]">
              아이가 이야기 용과 첫 모험을 마치면, 그 밤의 리포트가 여기에 생겨요.
            </p>
          </Card>
        ) : (
          <>
            <EpisodeNavigator
              episode={selected}
              position={`${index + 1} / ${episodes.length}`}
              onOlder={older ? () => setEpisodeId(older.id) : null}
              onNewer={newer ? () => setEpisodeId(newer.id) : null}
            />
            <DailyLog
              episode={selected}
              report={selected.report}
              childName={activeChild.name}
              planetNames={planetNames}
              onPickSeed={pickSeed}
              loading={detailLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

function EpisodeNavigator({
  episode,
  position,
  onOlder,
  onNewer,
}: {
  episode: ParentEpisode;
  position: string;
  onOlder: (() => void) | null;
  onNewer: (() => void) | null;
}) {
  const night = nightOf(episode.startedAt);
  const when = night ? `${night.longDate} ${night.weekday} 밤` : "";
  const arrow = `flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] text-[#20213d] transition enabled:hover:bg-[#f6efe2] disabled:text-[#cfc6b6] ${focusRing}`;
  return (
    <div className="flex items-center gap-1 rounded-[20px] border border-[#f0e2cb] bg-[#fffaf2] p-1.5">
      <button type="button" className={arrow} onClick={onOlder ?? undefined} disabled={!onOlder} aria-label="이전 이야기">
        <ChevronLeft size={20} />
      </button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <p className="text-[12.5px] text-[#565073]">
          {when}
          {when && " · "}
          {episode.episodeNumber}화 <span className="sr-only">({position})</span>
        </p>
        <p className="truncate font-display text-[17px] leading-snug text-[#20213d]">
          {episode.title ?? episode.islandTitle ?? `${episode.episodeNumber}번째 이야기`}
        </p>
      </div>
      <button type="button" className={arrow} onClick={onNewer ?? undefined} disabled={!onNewer} aria-label="다음 이야기">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
