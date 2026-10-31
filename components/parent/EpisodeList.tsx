"use client";
// 이야기 기록: 완성된 회차 목록 (제목 · 별 · 날짜) → 동화책. 소유: 역할 4.
import Link from "next/link";
import { familiarName, nightOf } from "@/lib/story/weeklyReport";
import { BookOpenIcon, ChevronRight, WeatherIcon } from "./icons";
import { useParentData } from "./ParentDataProvider";
import { Card, CardTitle, focusRing, Skeleton } from "./ui";

export default function EpisodeList() {
  const { status, activeChild, planetNames } = useParentData();

  if (status === "loading" || !activeChild) {
    return (
      <div className="space-y-3 pt-1" role="status" aria-label="불러오는 중">
        <Skeleton className="h-8 w-40" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[84px] rounded-[20px]" />
        ))}
      </div>
    );
  }

  const episodes = [...activeChild.episodes].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  return (
    <div className="pt-1">
      <h1 className="font-display text-[24px] leading-tight">이야기 기록</h1>
      <p className="mt-1 text-[14px] text-[#565073]">
        {episodes.length
          ? `${familiarName(activeChild.name) ?? "아이"}와 이야기 용이 만든 이야기 ${episodes.length}편`
          : "아직 완성된 이야기가 없어요"}
      </p>

      {episodes.length === 0 ? (
        <Card className="mt-4">
          <CardTitle>첫 이야기를 기다리고 있어요</CardTitle>
          <p className="mt-2 text-[14px] leading-[1.6] text-[#565073]">
            아이가 이야기 용과 모험을 마치면, 그 밤의 이야기가 동화책으로 여기에 쌓여요.
          </p>
        </Card>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {episodes.map((e) => {
            const night = nightOf(e.startedAt);
            const planet = e.report?.planet ? e.report.planet.planet || planetNames[e.report.planet.id] : null;
            const title = e.title ?? e.islandTitle ?? `${e.episodeNumber}번째 이야기`;
            return (
              <li key={e.id}>
                <Link
                  href={`/parent/episodes/${encodeURIComponent(e.id)}`}
                  className={`flex min-h-[84px] items-center gap-3 rounded-[20px] border border-[#f0e2cb] bg-[#fffaf2] px-4 py-3 transition hover:bg-[#fffdf8] ${focusRing}`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#fff1d6]">
                    {e.report?.moodWeather ? (
                      <WeatherIcon weather={e.report.moodWeather} size={28} />
                    ) : (
                      <BookOpenIcon size={24} className="text-[#6c5ccf]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-[#565073]">
                      {e.episodeNumber}화{night ? ` · ${night.longDate} ${night.weekday} 밤` : ""}
                    </span>
                    <span className="mt-0.5 block truncate text-[16px] font-bold text-[#20213d]">{title}</span>
                    {(planet || e.islandTitle) && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {planet && (
                          <span className="rounded-full bg-[#efeaf8] px-2 py-0.5 text-[12px] text-[#3b3760]">{planet}</span>
                        )}
                        {e.islandTitle && e.islandTitle !== title && (
                          <span className="rounded-full bg-[#fff1d6] px-2 py-0.5 text-[12px] text-[#6a4a17]">{e.islandTitle}</span>
                        )}
                      </span>
                    )}
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-[#8c86a6]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
