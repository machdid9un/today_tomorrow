// POST /api/tts — text → 오디오 (TTS). 소유: 역할 2.
// 입력: JSON { text: string }
// 출력: audio/mpeg 바이너리 스트림
// 공급자: ElevenLabs TTS (eleven_multilingual_v2). .env.local에 ELEVENLABS_API_KEY 필요.
// 보이스는 OpenAI처럼 이름이 아니라 voice_id(긴 문자열)로 지정한다. ELEVENLABS_VOICE_ID로 바꿀 수 있고,
// 안 넣으면 ElevenLabs 기본 제공 보이스(Rachel) ID로 폴백한다 — 대시보드 Voice Library에서 원하는 걸로 교체 권장.
import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs 기본 제공 보이스(Rachel). 교체 권장.

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 600; // 턴당 출력 예산(README §5) 보호용 상한

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_MISSING", message: "ELEVENLABS_API_KEY가 설정되지 않았습니다." } },
      { status: 500 }
    );
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

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
    upstreamRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          // "신나는 어린 용" 톤: 안정성↓(변화폭 넓게, 단조롭지 않게), 스타일↑(과장된 표현),
          // 속도↑(활기차게). ElevenLabs는 OpenAI 같은 자연어 instructions가 없어 숫자로 흉내낸다.
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.8,
            style: 0.65,
            speed: 1.08,
            use_speaker_boost: true,
          },
        }),
      }
    );
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
