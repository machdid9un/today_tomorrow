// 랜딩 / 게스트 시작 = 첫 화면. 소유: 역할 4.
// 용이 머무는 별 + 큰 시작 버튼("이야기 용 만나기") → 오늘의 별 고르기 → POST /api/sessions → /kid/adventure.
import { Suspense } from "react";
import FrontDoor from "@/components/kid/FrontDoor";

export default function LandingPage() {
  return (
    <Suspense>
      <FrontDoor />
    </Suspense>
  );
}
