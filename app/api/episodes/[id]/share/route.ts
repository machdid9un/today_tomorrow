// POST /api/episodes/[id]/share — 공유 토큰 생성 (includeQuote 토글). 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  // TODO(역할 1): share_token_hash 생성, share_include_quote 저장.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
