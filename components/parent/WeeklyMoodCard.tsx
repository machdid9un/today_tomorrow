"use client";
// 주간 '마음 날씨' 카드: 주 라벨 + 한 줄 요약 + 큰 그림 + 요일 7칸. 소유: 역할 4.
import type { MoodWeather } from "@/lib/story/reportGenerator";
import { WEATHER_LABEL, type WeeklyDay, type WeeklyReport } from "@/lib/story/weeklyReport";
import { MoonIcon, SoftAlertIcon, WeatherIcon, WeatherIllustration } from "./icons";
import { focusRing } from "./ui";

const ACCENT: Record<MoodWeather, string> = {
  sunny: "text-[#b85c0a]",
  partly_cloudy: "text-[#9a5a12]",
  cloudy: "text-[#565073]",
  rainy: "text-[#3f5ea8]",
};

export interface WeeklyMoodCardProps {
  report: WeeklyReport;
  /** 이야기가 있는 요일을 누르면 그날 리포트로 */
  onOpenDay: (episodeId: string) => void;
}

export default function WeeklyMoodCard({ report, onOpenDay }: WeeklyMoodCardProps) {
  const { weather, weatherLabel } = report;
  return (
    <section
      aria-labelledby="weekly-mood-title"
      className="rounded-[28px] bg-gradient-to-b from-[#ffe8c6] to-[#ffdcb9] p-[10px] shadow-[0_1px_0_rgba(32,33,61,0.03)]"
    >
      <div className="flex items-start gap-1 px-[10px] pt-[10px]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#7a5536]">{report.weekRangeLabel}</p>
          <h2 id="weekly-mood-title" className="mt-2 font-display text-[23px] leading-[1.32] text-[#20213d] min-[380px]:text-[26px]">
            {report.headlineLead}
            {weather && weatherLabel && (
              <span className={`mt-0.5 block ${ACCENT[weather]}`}>{weatherLabel}</span>
            )}
          </h2>
        </div>
        <WeatherIllustration weather={weather} className="-mr-1 h-auto w-[92px] shrink-0 min-[380px]:w-[108px]" />
      </div>

      {report.hasSafetyFlags && report.safetyEpisodeIds[0] && (
        <button
          type="button"
          onClick={() => onOpenDay(report.safetyEpisodeIds[0])}
          className={`mx-[10px] mt-3 flex min-h-[44px] w-[calc(100%-20px)] items-center gap-2 rounded-[15px] bg-[#fffaf2]/80 px-3 py-2 text-left text-[13px] leading-snug text-[#7a3a24] ${focusRing}`}
        >
          <SoftAlertIcon size={18} className="shrink-0" />
          <span>이번 주 이야기 중 따로 살펴봐 주실 말이 있었어요. 눌러서 확인해 주세요.</span>
        </button>
      )}

      <ol className="mt-4 grid grid-cols-7 rounded-[20px] bg-[#fff6ea]/85 py-0.5" aria-label="요일별 마음 날씨">
        {report.days.map((day) => (
          <li key={day.date} className="min-w-0">
            <DayCell day={day} onOpen={onOpenDay} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DayCell({ day, onOpen }: { day: WeeklyDay; onOpen: (id: string) => void }) {
  const base = `flex h-[66px] w-full flex-col items-center justify-center gap-1.5 rounded-[15px] ${
    day.isToday ? "bg-[#fffaf2] shadow-[0_1px_4px_rgba(122,85,54,0.12)]" : ""
  }`;
  const label = (
    <span className={`text-[13px] leading-none ${day.isToday ? "font-bold text-[#20213d]" : "font-medium text-[#3d3a57]"}`}>
      {day.label}
    </span>
  );
  const when = `${day.weekday} ${day.dateLabel}${day.isToday ? " 오늘" : ""}`;

  if (day.episodeId) {
    const state = day.weather ? WEATHER_LABEL[day.weather] : "마음 날씨 기록 없음";
    return (
      <button
        type="button"
        onClick={() => onOpen(day.episodeId as string)}
        aria-label={`${when}, ${state}. 그날 이야기 리포트 보기`}
        className={`${base} transition hover:bg-[#fffaf2]/70 ${focusRing}`}
      >
        {label}
        {day.weather ? (
          <WeatherIcon weather={day.weather} size={24} />
        ) : (
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#b6abd9]" />
        )}
      </button>
    );
  }

  return (
    <div className={base} role="img" aria-label={`${when}, ${day.isFuture ? "아직 오지 않은 날" : day.isToday ? "오늘 밤 이야기 전" : "이야기 없음"}`}>
      {label}
      {day.isToday ? (
        <MoonIcon size={20} className="text-[#c9a46a]" />
      ) : (
        <span
          aria-hidden="true"
          className={`h-[18px] w-[18px] rounded-full border-[1.5px] border-dashed ${day.isFuture ? "border-[#ead9bf]" : "border-[#d6c1a0]"}`}
        />
      )}
    </div>
  );
}
