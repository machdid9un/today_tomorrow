// POST /api/transcribe — 오디오 → text (STT). 소유: 역할 2.
// 입력: multipart/form-data, field "audio" (Blob, 브라우저 MediaRecorder 산출물, 보통 audio/webm)
// 출력: { text: string }
// 공급자: OpenAI Whisper (whisper-1). .env.local에 OPENAI_API_KEY 필요.
// 주의: openai SDK는 새 패키지라 설치하지 않고 fetch로 직접 호출합니다(README 협업 규칙).
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_MISSING", message: "OPENAI_API_KEY가 설정되지 않았습니다." } },
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
  // 확장자는 브라우저 MediaRecorder의 mimeType에 맞춰 대략적으로 지정 (webm 기본 가정)
  upstreamForm.append("file", audio, "utterance.webm");
  upstreamForm.append("model", "whisper-1");
  upstreamForm.append("language", "ko");

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
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
