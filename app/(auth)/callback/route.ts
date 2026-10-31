// 매직링크 콜백. 소유: 역할 1.
// TODO(역할 1): 코드 교환 → 세션 쿠키 설정 → 게스트 세계관 귀속(claim) → 리다이렉트.
import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
