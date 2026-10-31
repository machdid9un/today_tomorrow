// 회원가입/로그인 (이메일+비밀번호). 소유: 역할 1 (화면은 역할 4의 LoginScreen).
// LoginScreen이 POST /api/auth/signup | /api/auth/login을 호출하고, 성공하면 받은 worldId를
// localStorage에 저장한 뒤 next로 이동한다(§9-계정, app/api/auth/signup/route.ts 상단 메모 참고).
import type { Metadata } from "next";
import { Suspense } from "react";
import LoginScreen from "@/components/parent/LoginScreen";

export const metadata: Metadata = { title: "로그인 · 쫑긋" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
