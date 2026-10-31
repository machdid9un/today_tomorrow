// GET /api/episodes?worldId= — 회차 목록 (섬 리스트). 소유: 역할 1.
import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  // TODO(역할 1): worldId 쿼리 파싱, 소유권 검증 후 episodes 조회.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
