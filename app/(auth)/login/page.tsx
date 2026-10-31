// 로그인 (매직링크 요청). 소유: 역할 1 (화면은 역할 4의 LoginScreen).
// 매직링크 전송은 LoginScreen이 lib/db/supabaseClient로 요청하고, 링크는 /callback?next=… 로 돌아온다.
// TODO(역할 1): /callback 에서 코드 교환 → 세션 쿠키 → 게스트 세계관 귀속(claim) → next로 리다이렉트.
import type { Metadata } from "next";
import { Suspense } from "react";
import LoginScreen from "@/components/parent/LoginScreen";

export const metadata: Metadata = { title: "로그인 · 상상 무전기" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
