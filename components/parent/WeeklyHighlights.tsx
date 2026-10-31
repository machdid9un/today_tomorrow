"use client";
// "이번 주에 이런 모습이 보였어요" 카드: 근거 있는 3줄 + 아이가 한 말 + 이야기 전체 보기. 소유: 역할 4.
import Link from "next/link";
import { nameWithSubject, type WeeklyBulletKind, type WeeklyReport } from "@/lib/story/weeklyReport";
import { ChevronRight } from "./icons";
import { buttonOutline, Card, CardTitle } from "./ui";

const DOT: Record<WeeklyBulletKind, string> = {
  mood: "bg-[#ffb547]",
  feeling: "bg-[#9d99b8]",
  keyword: "bg-[#8b7fd6]",
  choices: "bg-[#ff876e]",
  planet: "bg-[#7fb4d9]",
  count: "bg-[#c9b48f]",
};

export default function WeeklyHighlights({ report, childName }: { report: WeeklyReport; childName: string | null }) {
  const { bullets, quote } = report;
  return (
    <Card aria-labelledby="weekly-highlights-title">
      <CardTitle id="weekly-highlights-title">이번 주에 이런 모습이 보였어요</CardTitle>

      {bullets.length ? (
        <ul className="mt-4 space-y-3">
          {bullets.map((b) => (
            <li key={b.kind} className="flex gap-3 text-[15px] leading-[1.55] text-[#2f2c4a]">
              <span aria-hidden="true" className={`mt-[9px] h-2 w-2 shrink-0 rounded-full ${DOT[b.kind]}`} />
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[14px] leading-[1.6] text-[#565073]">
          이번 주 이야기가 쌓이면, 아이가 한 말과 고른 것을 근거로 여기에서 정리해 드려요.
        </p>
      )}

      {quote && (
        <>
          <figure className="mt-5 rounded-[20px] bg-[#efeaf8] px-4 py-4">
            <figcaption className="text-[13px] text-[#565073]">
              {nameWithSubject(childName)} 한 말 · {quote.weekdayLabel} {quote.episodeNumber}화
            </figcaption>
            <blockquote className="mt-2 text-[16px] font-bold leading-[1.6] text-[#20213d]">“{quote.text}”</blockquote>
          </figure>
          <Link href={`/parent/episodes/${encodeURIComponent(quote.episodeId)}`} className={`mt-4 ${buttonOutline}`}>
            이야기 전체 보기 <ChevronRight size={18} />
          </Link>
        </>
      )}
    </Card>
  );
}
