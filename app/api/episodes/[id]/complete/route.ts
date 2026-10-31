// POST /api/episodes/[id]/complete — 회차 종료, 역할 3 생성기 호출 → 리포트·기억·동화책 저장. 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  // TODO(역할 1): generateParentReport + summarizeEpisode 호출, 턴 기록 저장 우선.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
