// GET /api/episodes/[id] — 회차 상세. 모드별 응답 분리(아이=동화책 텍스트만, 부모=리포트+원본). 소유: 역할 1.
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  // TODO(역할 1): Mode(parent|kid)에 따라 응답 필드를 분리.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
