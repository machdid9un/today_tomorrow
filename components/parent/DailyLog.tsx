"use client";
// 하루씩 보기: 한 회차의 마음 리포트. 소유: 역할 4.
// 요약 · 아이가 한 말 · 고른 것 · 근거 붙은 관찰 · 건네볼 한마디 · 마음 날씨 · 별 진행 · 내일 예고 · 동화책.
// 리포트 생성기(역할 3)가 검증한 값만 그대로 보여 준다. 화면에서 새 해석을 덧붙이지 않는다.
import Link from "next/link";
import type { ParentReportOut } from "@/lib/story/reportGenerator";
import { nameWithSubject, WEATHER_LABEL } from "@/lib/story/weeklyReport";
import { BookOpenIcon, CheckIcon, ChevronRight, HeartNoteIcon, PlanetIcon, SoftAlertIcon, WeatherIcon } from "./icons";
import type { ParentEpisode } from "./parentData";
import type { SeedOption } from "./SeedSelector";
import { buttonOutline, Card, CardTitle, EvidenceChip, focusRing } from "./ui";

export interface DailyLogProps {
  episode: ParentEpisode;
  report: ParentReportOut | null;
  childName: string | null;
  planetNames: Record<string, string>;
  /** 내일 이야기 추천에서 '이 마음 고르기' */
  onPickSeed?: (preset: SeedOption) => void;
  /** 상세를 불러오는 중 */
  loading?: boolean;
}

export default function DailyLog({ episode, report, childName, planetNames, onPickSeed, loading }: DailyLogProps) {
  const subject = nameWithSubject(childName);
  const storyHref = `/parent/episodes/${encodeURIComponent(episode.id)}`;

  if (!report) {
    return (
      <Card>
        <CardTitle>{loading ? "리포트를 불러오고 있어요" : "이 밤의 리포트가 아직 없어요"}</CardTitle>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#565073]">
          {loading
            ? "잠시만 기다려 주세요."
            : "리포트를 만들지 못했거나 아직 만드는 중이에요. 이야기 기록은 남아 있으니 동화책은 먼저 볼 수 있어요."}
        </p>
        <Link href={storyHref} className={`mt-4 ${buttonOutline}`}>
          동화책 보기 <ChevronRight size={18} />
        </Link>
      </Card>
    );
  }

  const planetName = report.planet
    ? report.planet.planet || planetNames[report.planet.id] || "오늘의 별"
    : null;

  return (
    <div className="space-y-4">
      {report.safetyFlags.length > 0 && (
        <section aria-labelledby="safety-title" className="rounded-[20px] border border-[#f1c2b2] bg-[#fff1ea] p-4">
          <h2 id="safety-title" className="flex items-center gap-2 text-[15px] font-bold text-[#7a3a24]">
            <SoftAlertIcon size={18} /> 따로 살펴봐 주세요
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-[1.55] text-[#5a2e20]">
            {report.safetyFlags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] leading-[1.55] text-[#6b4a3e]">
            이 말은 요약·인용에 넣지 않았어요. 캐묻기보다, 편안한 때에 가볍게 이야기를 나눠 보세요.
          </p>
        </section>
      )}

      {/* 마음 날씨 + 요약 */}
      <Card aria-labelledby="daily-mood-title">
        <div className="flex items-center gap-3">
          {report.moodWeather ? (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#fff1d6]">
              <WeatherIcon weather={report.moodWeather} size={36} />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-[13px] text-[#565073]">이 밤의 마음 날씨</p>
            <h2 id="daily-mood-title" className="font-display text-[22px] leading-tight">
              {report.moodWeather ? WEATHER_LABEL[report.moodWeather] : "기록 없음"}
            </h2>
          </div>
        </div>
        {report.moodNote && <p className="mt-3 text-[14px] leading-[1.6] text-[#3d3a57]">{report.moodNote}</p>}
        {report.moodEvidence && report.moodEvidence.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="마음 날씨의 근거가 된 말">
            {report.moodEvidence.map((e) => (
              <EvidenceChip key={e} text={e} />
            ))}
          </div>
        )}
        {report.summary && (
          <div className="mt-4 border-t border-[#f0e2cb] pt-4">
            <h3 className="text-[13px] font-bold text-[#565073]">오늘 이야기</h3>
            <p className="mt-1.5 text-[15px] leading-[1.65] text-[#20213d]">{report.summary}</p>
          </div>
        )}
      </Card>

      {/* 아이가 한 말 */}
      {report.childQuotes.length > 0 && (
        <Card aria-labelledby="daily-quotes-title">
          <CardTitle id="daily-quotes-title">{subject} 한 말</CardTitle>
          <ul className="mt-3 space-y-2">
            {report.childQuotes.map((q) => (
              <li key={q} className="rounded-[15px] bg-[#efeaf8] px-4 py-3 text-[15px] font-bold leading-[1.55]">
                “{q}”
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 고른 것 */}
      {report.childChoices.length > 0 && (
        <Card aria-labelledby="daily-choices-title">
          <CardTitle id="daily-choices-title">이야기 속에서 고른 것</CardTitle>
          <ul className="mt-3 space-y-2.5">
            {report.childChoices.map((c) => (
              <li key={c} className="flex gap-2.5 text-[15px] leading-[1.55]">
                <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#20213d] text-white">
                  <CheckIcon size={12} />
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 관찰 + 근거 */}
      {report.observations.length > 0 && (
        <Card aria-labelledby="daily-obs-title">
          <CardTitle id="daily-obs-title">이런 모습이 보였어요</CardTitle>
          <ul className="mt-3 space-y-4">
            {report.observations.map((o) => (
              <li key={o.inference}>
                <p className="text-[15px] leading-[1.65]">{o.inference}</p>
                {o.evidence.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-bold text-[#565073]">근거</span>
                    {o.evidence.map((e) => (
                      <EvidenceChip key={e} text={e} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-[1.5] text-[#565073]">
            이야기 속 모습을 정리한 기록이에요. 아이를 평가하려는 글이 아니에요.
          </p>
        </Card>
      )}

      {/* 건네볼 한마디 */}
      {report.lineForParent && (
        <section aria-labelledby="daily-line-title" className="rounded-[28px] bg-[#ffe2a2]/60 p-5">
          <h2 id="daily-line-title" className="flex items-center gap-2 text-[14px] font-bold text-[#6a4a17]">
            <HeartNoteIcon size={18} /> 내일 건네볼 한마디
          </h2>
          <p className="mt-2 font-display text-[19px] leading-[1.5] text-[#20213d]">“{report.lineForParent}”</p>
        </section>
      )}

      {/* 별 진행 */}
      {report.planet && planetName && (
        <Card aria-labelledby="daily-planet-title">
          <div className="flex items-center justify-between gap-3">
            <CardTitle id="daily-planet-title" className="flex items-center gap-2">
              <PlanetIcon size={20} className="text-[#6c5ccf]" /> {planetName}
            </CardTitle>
            <span className="shrink-0 text-[14px] font-bold text-[#3d3a57]">
              {report.planet.done}/{report.planet.total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${planetName} 모험 진행`}
            aria-valuemin={0}
            aria-valuemax={report.planet.total}
            aria-valuenow={report.planet.done}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#f1e4cf]"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ffe2a2] to-[#ffb547]"
              style={{ width: `${Math.round((report.planet.done / report.planet.total) * 100)}%` }}
            />
          </div>
          {report.planet.goal && (
            <p className="mt-3 text-[14px] leading-[1.55] text-[#3d3a57]">이 밤의 목표: {report.planet.goal}</p>
          )}
          {report.planet.collected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="지금까지 모은 것">
              {report.planet.collected.map((c) => (
                <span key={c} className="rounded-full bg-[#fff1d6] px-3 py-1 text-[13px] text-[#6a4a17]">
                  {c}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 내일 예고 + 추천 */}
      {(report.nextEpisodeTeaser || (report.seedSuggestions && report.seedSuggestions.length > 0)) && (
        <Card aria-labelledby="daily-next-title">
          <CardTitle id="daily-next-title">다음 이야기</CardTitle>
          {report.nextEpisodeTeaser && (
            <p className="mt-2 text-[15px] leading-[1.6] text-[#20213d]">{report.nextEpisodeTeaser}</p>
          )}
          {report.seedSuggestions && report.seedSuggestions.length > 0 && (
            <div className="mt-4 space-y-2.5">
              <h3 className="text-[13px] font-bold text-[#565073]">이런 마음을 담아 볼 수 있어요</h3>
              {report.seedSuggestions.map((s) => (
                <div key={s.preset} className="rounded-[20px] border border-[#ece2d1] bg-[#fff4df]/60 p-3.5">
                  <p className="text-[14px] font-bold">{s.label}</p>
                  <p className="mt-1 text-[13.5px] leading-[1.55] text-[#3d3a57]">{s.reason}</p>
                  {onPickSeed && (
                    <button
                      type="button"
                      onClick={() => onPickSeed(s.preset)}
                      className={`mt-2 inline-flex min-h-[44px] items-center gap-1 rounded-[15px] px-1 text-[14px] font-bold text-[#6c5ccf] ${focusRing}`}
                    >
                      이 마음 고르기 <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Link href={storyHref} className={buttonOutline}>
        <BookOpenIcon size={18} /> 동화책으로 보기 <ChevronRight size={18} />
      </Link>
    </div>
  );
}
