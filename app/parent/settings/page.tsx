// 부모 모드: 설정 (자리만 마련, P2). 소유: 역할 4.
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitle, buttonOutline } from "@/components/parent/ui";
import { SEED_GUARDRAILS } from "@/lib/story/seedPresets";

export const metadata: Metadata = { title: "설정 · 상상 무전기" };

const SOON = [
  { title: "아이 정보", body: "이름과 나이를 바꾸는 기능은 곧 열려요." },
  { title: "보호자 확인", body: "리포트를 열 때 쓰는 보호자 확인(PIN)은 준비 중이에요." },
  { title: "다른 기기에서 보기", body: "이메일로 받은 링크로 로그인하면 다른 기기에서도 이어 볼 수 있어요. 곧 열려요." },
];

export default function ParentSettingsPage() {
  return (
    <div className="space-y-4 pt-1">
      <h1 className="font-display text-[24px] leading-tight">설정</h1>

      <Card aria-labelledby="promise-title">
        <CardTitle id="promise-title">마음 담기 약속</CardTitle>
        <ul className="mt-3 space-y-2.5">
          {SEED_GUARDRAILS.map((g) => (
            <li key={g} className="flex gap-3 text-[14px] leading-[1.6] text-[#2f2c4a]">
              <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b6abd9]" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </Card>

      {SOON.map((s) => (
        <Card key={s.title}>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{s.title}</CardTitle>
            <span className="shrink-0 rounded-full bg-[#f2e3cc] px-2.5 py-0.5 text-[12px] font-medium text-[#565073]">준비 중</span>
          </div>
          <p className="mt-2 text-[14px] leading-[1.6] text-[#565073]">{s.body}</p>
        </Card>
      ))}

      <Link href="/kid" className={buttonOutline}>
        아이 모드로 돌아가기
      </Link>
    </div>
  );
}
