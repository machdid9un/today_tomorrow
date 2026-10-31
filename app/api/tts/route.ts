// POST /api/tts — text → 오디오 (TTS). 소유: 역할 2.
// 입력: JSON { text: string }
// 출력: audio/mpeg 바이너리 스트림
// 공급자: ElevenLabs TTS (eleven_v3, Audio Tag 지원). .env.local에 ELEVENLABS_API_KEY 필요.
// 보이스는 OpenAI처럼 이름이 아니라 voice_id(긴 문자열)로 지정한다. ELEVENLABS_VOICE_ID로 바꿀 수 있고,
// 안 넣으면 ElevenLabs 기본 제공 보이스(Rachel) ID로 폴백한다 — 대시보드 Voice Library에서 원하는 걸로 교체 권장.
import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs 기본 제공 보이스(Rachel). 교체 권장.
// eleven_v3의 Audio Tag: voice_settings 숫자값보다 훨씬 확실하게 감정/캐릭터를 바꿔준다.
// "신나는 어린 용" 톤 요청에 맞춰 [excited]를 문장 앞에 붙인다.
const AUDIO_TAG = "[excited]";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 600; // 턴당 출력 예산(README §5) 보호용 상한

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_MISSING",
          message: "ELEVENLABS_API_KEY가 설정되지 않았습니다.",
        },
      },
      { status: 500 },
    );
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "JSON 본문이 필요합니다." } },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { error: { code: "NO_TEXT", message: "text가 비어있습니다." } },
      { status: 400 },
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: { code: "TEXT_TOO_LONG", message: "문장이 너무 길어요." } },
      { status: 400 },
    );
  }

  const upstreamUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const upstreamInit: RequestInit = {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `${AUDIO_TAG} ${text}`,
      model_id: "eleven_v3",
      // Audio Tag가 감정의 핵심을 담당하고, 숫자값은 보조적으로 변화폭·속도만 살짝 더 준다.
      voice_settings: {
        stability: 0.3,
        similarity_boost: 0.8,
        style: 0.65,
        speed: 1.08,
        use_speaker_boost: true,
      },
    }),
  };
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, upstreamInit);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNREACHABLE",
          message: "TTS 서버에 연결할 수 없습니다.",
        },
      },
      { status: 502 },
    );
  }

  if (!upstreamRes.ok || !upstreamRes.body) {
    const detail = await upstreamRes.text().catch(() => "");
    // 동시 요청 초과(429 concurrent_limit)는 잠깐 뒤 한 번 더 — 한 턴의 문장 여러 개가 겹칠 때 뒤쪽 문장만 소리가 빠지는 것을 막는다
    if (upstreamRes.status === 429) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const retry = await fetch(upstreamUrl, upstreamInit);
        if (retry.ok && retry.body) {
          return new NextResponse(retry.body, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        }
      } catch {
        /* 아래에서 원래 실패로 응답 */
      }
    }
    return NextResponse.json(
      {
        error: {
          code: "TTS_FAILED",
          message: "음성을 만들지 못했어요.",
          detail,
        },
      },
      { status: 502 },
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
