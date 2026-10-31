"use client";
// 아이 모드: 섬 리스트 · 오늘의 동화 만들기. 소유: 역할 4.
// TODO(역할 4): 완료 회차 섬 카드 리스트 + 실제 디자인으로 이 임시 화면을 교체.
//
// 임시(로컬 테스트용): 역할 4의 실제 UI가 준비되기 전까지, 핵심 기능(마이크 권한 → VAD/녹음
// → STT → 스토리 턴 → TTS 재생)을 바로 확인할 수 있게 최소한의 진입 버튼만 둔다.
// mock-로 시작하는 episodeId는 DB 없이 서버 메모리로 동작한다(lib/story/contextStore.ts).
// 행성(오늘의 별)을 미리 골라서 themeId로 넘기면, 그 행성의 설정(lib/story/themes.ts)대로
// 대화가 진행되는지 테스트할 수 있다(안 고르면 기존처럼 episodeId로 무작위 고정 선택).
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanetId } from "@/components/voice/types";

const PLANETS: { id: PlanetId; label: string; desc: string }[] = [
  { id: "forest", label: "구름숲", desc: "이름 짓기·창작" },
  { id: "waterfire", label: "물불", desc: "마음 듣기·관계" },
  { id: "upside", label: "거꾸로", desc: "반대말·언어" },
  { id: "rainbow", label: "숨은 무지개", desc: "색 찾기·감각" },
];

function freshMockEpisodeId(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const tag = Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)]).join(
    ""
  );
  return `mock-${tag}-1`;
}

export default function KidHomePage() {
  const router = useRouter();
  const [themeId, setThemeId] = useState<PlanetId | null>(null);

  const start = (short: boolean) => {
    const episodeId = freshMockEpisodeId();
    const params = new URLSearchParams({ episodeId });
    if (short) params.set("short", "1");
    if (themeId) params.set("themeId", themeId);
    router.push(`/kid/adventure?${params.toString()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="max-w-xs text-xs text-ink/50">
        (임시 테스트 화면입니다 — 실제 섬 리스트 UI는 역할 4가 구현할 예정이에요. 아래 버튼으로
        마이크·녹음·스토리 진행을 바로 테스트할 수 있어요.)
      </p>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-ink/70">오늘의 별 (안 고르면 무작위)</p>
        <div className="flex flex-wrap justify-center gap-2">
          {PLANETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setThemeId((cur) => (cur === p.id ? null : p.id))}
              className={`rounded-full border px-4 py-2 text-sm ${
                themeId === p.id
                  ? "border-signal bg-signal text-paper"
                  : "border-signal/40 text-ink/70"
              }`}
            >
              {p.label}
              <span className="ml-1 text-[10px] opacity-70">({p.desc})</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => start(false)}
        className="rounded-full bg-signal px-8 py-4 text-lg text-paper"
      >
        오늘의 동화 만들기
      </button>

      <button
        type="button"
        onClick={() => start(true)}
        className="text-sm text-ink/60 underline"
      >
        짧게 테스트하기 (3턴)
      </button>
    </main>
  );
}
