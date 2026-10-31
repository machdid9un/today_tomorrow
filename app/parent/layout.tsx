// 부모 모드 공통: 데이터만 한 번 불러와 /parent 아래 페이지들이 함께 쓴다. 화면 틀(머리·아래 탭)은 StoryParentApp 안에 있다. 소유: 역할 4.
// 서체(Jua·Noto Sans KR)는 app/globals.css에서 불러온다.
import type { Metadata, Viewport } from "next";
import ParentDataProvider from "@/components/parent/ParentDataProvider";
import { THEMES } from "@/lib/story/themes";

export const metadata: Metadata = {
  title: "교신 리포트 · 쫑긋",
  description: "아이가 이야기 속에서 한 말과 고른 것을 근거로 정리한 보호자용 리포트",
};

export const viewport: Viewport = {
  themeColor: "#fff6ec",
};

const PLANET_NAMES: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.id, t.planet]));

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <ParentDataProvider planetNames={PLANET_NAMES}>{children}</ParentDataProvider>;
}
