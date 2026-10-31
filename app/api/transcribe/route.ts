// POST /api/transcribe — 오디오 → text (STT). 소유: 역할 2.
// 입력: multipart/form-data, field "audio" (Blob, 브라우저 MediaRecorder 산출물, webm/mp4/ogg)
//   선택 필드: episodeId, themeId(오늘의 별), choices(JSON 배열, 방금 화면에 보여준 보기) —
//   있으면 keyterms(docs/stt-vocab-v2.md) 구성에 쓴다. 없어도 동작은 그대로(그냥 공통 낱말만 씀).
// 출력: { text: string }
// 공급자: ElevenLabs Scribe (scribe_v2). .env.local에 ELEVENLABS_API_KEY 필요.
import { NextResponse } from "next/server";
import { buildSttKeyterms } from "@/lib/story/sttContext";

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

  // keyterms: 아이가 말할 법한 낱말을 미리 알려줘 인식 정확도를 올린다(docs/stt-vocab-v2.md §7).
  // episodeId가 없으면(다른 호출부·과거 클라이언트) keyterms 없이 그대로 전사한다 — 실패해도 전사를 막지 않음.
  const episodeId = form.get("episodeId");
  const themeId = form.get("themeId");
  const choicesRaw = form.get("choices");
  let choices: string[] = [];
  if (typeof choicesRaw === "string") {
    try {
      const parsed = JSON.parse(choicesRaw);
      if (Array.isArray(parsed)) choices = parsed.filter((c): c is string => typeof c === "string");
    } catch {
      /* 보기 파싱 실패해도 keyterms 없이 진행 */
    }
  }
  if (typeof episodeId === "string" && episodeId) {
    try {
      const keyterms = await buildSttKeyterms(episodeId, choices, typeof themeId === "string" ? themeId : null);
      for (const term of keyterms) upstreamForm.append("keyterms", term);
    } catch {
      /* keyterms 준비 실패해도 전사 자체는 계속한다 */
    }
  }

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
