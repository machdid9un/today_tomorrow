"use client";
// 동화책 열람 (부모: 텍스트). 소유: 역할 4.
// 목록에 storybookText가 있으면 바로, 없으면 GET /api/episodes/[id]로 채운다.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { nightOf } from "@/lib/story/weeklyReport";
import { ChevronLeft, ChevronRight } from "./icons";
import { useParentData } from "./ParentDataProvider";
import type { ParentEpisode } from "./parentData";
import { buttonOutline, Card, CardTitle, focusRing, Skeleton } from "./ui";

export default function StorybookView({ episodeId }: { episodeId: string }) {
  const { status, findEpisode, loadEpisodeDetail, planetNames } = useParentData();
  const known = status === "ready" ? findEpisode(episodeId) : null;
  const [fetched, setFetched] = useState<ParentEpisode | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const tried = useRef(new Set<string>());

  useEffect(() => {
    if (status !== "ready") return;
    if (known?.storybookText || tried.current.has(episodeId)) return;
    tried.current.add(episodeId);
    setState("loading");
    // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 결과를 버리지 않게 취소 플래그를 두지 않는다.
    // 다른 회차로 넘어간 뒤 늦게 온 결과는 아래 fetched.id 비교로 걸러진다.
    loadEpisodeDetail(episodeId).then((ep) => {
      setFetched(ep);
      setState(ep?.storybookText ? "idle" : "failed");
    });
    // 회차마다 한 번만 시도한다 (불러온 값이 known을 바꿔도 다시 부르지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, episodeId, loadEpisodeDetail]);

  const fetchedHere = fetched && fetched.id === episodeId ? fetched : null;
  const episode = known?.storybookText ? known : fetchedHere ?? known;
  const back = (
    <Link href="/parent/episodes" className={`-ml-2 inline-flex min-h-[44px] items-center gap-0.5 rounded-[15px] px-2 text-[14px] font-medium text-[#565073] ${focusRing}`}>
      <ChevronLeft size={18} /> 이야기 기록
    </Link>
  );

  if (status === "loading" || (state === "loading" && !episode?.storybookText)) {
    return (
      <div className="pt-1" role="status" aria-label="동화책을 불러오는 중">
        {back}
        <Skeleton className="mt-2 h-8 w-3/4" />
        <Skeleton className="mt-4 h-[320px] rounded-[28px]" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="pt-1">
        {back}
        <Card className="mt-2">
          <CardTitle>이야기를 찾지 못했어요</CardTitle>
          <p className="mt-2 text-[14px] leading-[1.6] text-[#565073]">주소가 바뀌었거나, 다른 기기에서 만든 이야기일 수 있어요.</p>
        </Card>
      </div>
    );
  }

  const night = nightOf(episode.startedAt);
  const planet = episode.report?.planet ? episode.report.planet.planet || planetNames[episode.report.planet.id] : null;
  const paragraphs = (episode.storybookText ?? "")
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const title = episode.title ?? episode.islandTitle ?? `${episode.episodeNumber}번째 이야기`;
  const islandChip = episode.islandTitle && episode.islandTitle !== title ? episode.islandTitle : null;

  return (
    <article className="pt-1" aria-labelledby="storybook-title">
      {back}
      <p className="mt-1 text-[13px] text-[#565073]">
        {episode.episodeNumber}화{night ? ` · ${night.longDate} ${night.weekday} 밤` : ""}
      </p>
      <h1 id="storybook-title" className="mt-1 font-display text-[26px] leading-[1.3]">
        {title}
      </h1>
      {(planet || islandChip) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {planet && <span className="rounded-full bg-[#efeaf8] px-2.5 py-1 text-[12.5px] text-[#3b3760]">{planet}</span>}
          {islandChip && (
            <span className="rounded-full bg-[#fff1d6] px-2.5 py-1 text-[12.5px] text-[#6a4a17]">{islandChip}</span>
          )}
        </div>
      )}

      <Card as="div" className="mt-4 px-6 py-6">
        {paragraphs.length ? (
          <div className="space-y-5 text-[16.5px] leading-[1.95] text-[#2a2845]">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-[14px] leading-[1.6] text-[#565073]">
            {state === "failed" ? "동화책을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요." : "이 이야기는 아직 동화책으로 만들어지지 않았어요."}
          </p>
        )}
      </Card>

      <Link href={`/parent?view=daily&ep=${encodeURIComponent(episode.id)}`} className={`mt-4 ${buttonOutline}`}>
        이 밤의 마음 리포트 보기 <ChevronRight size={18} />
      </Link>
    </article>
  );
}
