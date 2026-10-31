// POST /api/tts — text → 오디오 (TTS). 소유: 역할 2.
// 입력: JSON { text: string }
// 출력: audio/mpeg 바이너리 스트림
// 공급자: OpenAI TTS (tts-1, voice: nova). .env.local에 OPENAI_API_KEY 필요.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 600; // 턴당 출력 예산(README §5) 보호용 상한

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_MISSING", message: "OPENAI_API_KEY가 설정되지 않았습니다." } },
      { status: 500 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "JSON 본문이 필요합니다." } },
      { status: 400 }
    );
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { error: { code: "NO_TEXT", message: "text가 비어있습니다." } },
      { status: 400 }
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: { code: "TEXT_TOO_LONG", message: "문장이 너무 길어요." } },
      { status: 400 }
    );
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "nova",
        input: text,
        response_format: "mp3",
      }),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNREACHABLE", message: "TTS 서버에 연결할 수 없습니다." } },
      { status: 502 }
    );
  }

  if (!upstreamRes.ok || !upstreamRes.body) {
    const detail = await upstreamRes.text().catch(() => "");
    return NextResponse.json(
      { error: { code: "TTS_FAILED", message: "음성을 만들지 못했어요.", detail } },
      { status: 502 }
    );
  }

  return new NextResponse(upstreamRes.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
