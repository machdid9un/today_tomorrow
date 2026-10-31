// POST /api/episodes/[id]/next — 기억을 이어받은 다음 화 생성. 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  // TODO(역할 1): 전 회차 memory_json 기반 다음 episode 레코드 생성.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
