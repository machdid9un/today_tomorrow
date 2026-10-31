// POST /api/sessions — 게스트/회원 모험 생성 → worldId, episodeId. 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 1): 로그인/게스트 세션 생성, world/episode 레코드 생성.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
