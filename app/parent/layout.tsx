// 부모 모드 공통 틀 (마음 리포트 · 이야기 기록 · 설정). 소유: 역할 4.
// 데이터는 ParentDataProvider가 한 번 불러와 /parent 아래 페이지들이 함께 쓴다.
// 글꼴: 루트 layout(역할 1)에 아직 Jua·Noto Sans KR 로딩이 없어 부모 화면에서만 불러온다.
//       루트에서 불러오게 되면 아래 <link> 세 줄은 지워도 된다 (tailwind font-display / font-sans가 그대로 이어받음).
import type { Metadata, Viewport } from "next";
import ParentDataProvider from "@/components/parent/ParentDataProvider";
import ParentShell from "@/components/parent/ParentShell";
import { THEMES } from "@/lib/story/themes";

export const metadata: Metadata = {
  title: "마음 리포트 · 상상 무전기",
  description: "아이가 이야기 속에서 한 말과 고른 것을 근거로 정리한 보호자용 마음 리포트",
};

export const viewport: Viewport = {
  themeColor: "#fff4df",
};

const PLANET_NAMES: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.id, t.planet]));

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap"
      />
      <ParentDataProvider planetNames={PLANET_NAMES}>
        <ParentShell>{children}</ParentShell>
      </ParentDataProvider>
    </>
  );
}
