// POST /api/transcribe — 오디오 → text (STT). 소유: 역할 2.
// 입력: multipart/form-data, field "audio" (Blob, 브라우저 MediaRecorder 산출물, webm/mp4/ogg)
// 출력: { text: string }
// 공급자: ElevenLabs Scribe (scribe_v2). .env.local에 ELEVENLABS_API_KEY 필요.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_MISSING", message: "ELEVENLABS_API_KEY가 설정되지 않았습니다." } },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "multipart/form-data 요청이 필요합니다." } },
      { status: 400 }
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: { code: "NO_AUDIO", message: "audio 필드가 비어있습니다." } },
      { status: 400 }
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "utterance");
  upstreamForm.append("model_id", "scribe_v2"); // ElevenLabs STT는 model_id 필수

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstreamForm,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNREACHABLE", message: "STT 서버에 연결할 수 없습니다." } },
      { status: 502 }
    );
  }

  if (!upstreamRes.ok) {
    const detail = await upstreamRes.text().catch(() => "");
    return NextResponse.json(
      { error: { code: "STT_FAILED", message: "말을 잘 듣지 못했어요. 다시 말해줄래?", detail } },
      { status: 502 }
    );
  }

  const data = (await upstreamRes.json()) as { text?: string };
  const text = (data.text ?? "").trim();

  return NextResponse.json({ text });
}
