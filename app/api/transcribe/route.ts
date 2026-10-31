// POST /api/transcribe — 오디오 → text (STT). 소유: 역할 2.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 2): 오디오 바이너리 수신 → STT API 호출 → { text } 반환.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
