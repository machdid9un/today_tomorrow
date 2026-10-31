// POST /api/tts — text → 오디오 (TTS). 소유: 역할 2.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 2): TTS API 호출 → 오디오 스트림/바이너리 반환.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
