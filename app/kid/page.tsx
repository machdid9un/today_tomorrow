// 아이 모드 메인: 랜딩과 같은 첫 화면 (별 · 장소 카드 · 오늘의 동화 · 부모 관문). ?view=map 이면 이야기 지도부터. 소유: 역할 4.
import type { Metadata } from "next";
import { Suspense } from "react";
import FrontDoor from "@/components/kid/FrontDoor";


export const metadata: Metadata = { title: "쫑긋" };

export default function KidHomePage() {
  return (
    <Suspense>
      <FrontDoor />
    </Suspense>
  );
}
