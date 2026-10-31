// POST /api/sessions/claim — 로그인 후 게스트 세계관을 계정에 귀속. 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 1): 게스트 토큰 검증 후 owner_user_id 갱신.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
