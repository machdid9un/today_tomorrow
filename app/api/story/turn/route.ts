// POST /api/story/turn — episodeId, childText → SSE(sentence / turn_complete / error). 소유: 역할 3.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 3): generateTurn 호출, 문장 단위 SSE 스트리밍으로 변환.
  // event: sentence / event: turn_complete / event: error (README §8 이벤트 포맷 참고)
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
