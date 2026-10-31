// POST /api/story/turn — 턴 하나를 SSE로 스트리밍. 소유: 역할 3.
// 요청: { episodeId, childText, turnIndex?, forceEnd?, prevLatencyMs?(=latencyMs), short? }
//   turnIndex를 안 보내면 서버가 지금까지 저장된 턴 수로 정한다(첫 호출 = 0 = 첫 인사).
// 응답 이벤트: sentence(index 순서 = TTS 재생 순서) → turn_complete, 실패 시 error  (README §8)
// 주의: POST라서 브라우저 EventSource로는 못 받음. fetch + response.body.getReader()로 읽을 것.
import { loadEpisodeContext, saveTurn } from "@/lib/story/contextStore";
import { generateTurn, splitSentences } from "@/lib/story/storyEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface TurnRequestBody {
  episodeId?: unknown;
  childText?: unknown;
  turnIndex?: unknown;
  forceEnd?: unknown;
  prevLatencyMs?: unknown;
  latencyMs?: unknown; // 역할 2 클라이언트가 쓰는 이름 (prevLatencyMs와 같은 뜻)
  short?: unknown;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TurnRequestBody | null;

  const episodeId = typeof body?.episodeId === "string" ? body.episodeId.trim() : "";
  if (!episodeId) {
    return Response.json({ error: "episodeId가 필요합니다." }, { status: 400 });
  }
  const childText = typeof body?.childText === "string" ? body.childText.trim().slice(0, 500) : "";
  const requestedTurnIndex =
    typeof body?.turnIndex === "number" && Number.isInteger(body.turnIndex) && body.turnIndex >= 0
      ? body.turnIndex
      : null;
  const forceEnd = body?.forceEnd === true;
  const short = body?.short === true;
  const rawLatency = body?.prevLatencyMs ?? body?.latencyMs;
  const prevLatencyMs =
    typeof rawLatency === "number" && Number.isFinite(rawLatency) ? rawLatency : null;

  // TODO(역할 1 연동): 게스트 쿠키/로그인 세션으로 episodeId 소유권 검사

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const t0 = Date.now();

      try {
        const ctx = await loadEpisodeContext(episodeId);
        // 클라이언트가 턴 번호를 안 보내면 서버 기록으로 정한다 (저장된 턴 수 = 다음 턴 번호)
        const turnIndex = requestedTurnIndex ?? ctx.history.length;
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - ctx.startedAt) / 1000));

        const turn = await generateTurn({ ctx, childText, turnIndex, elapsedSeconds, forceEnd, short });

        splitSentences(turn.narration).forEach((text, index) => send("sentence", { index, text }));
        send("turn_complete", {
          choices: turn.choices,
          shouldEnd: turn.shouldEnd,
          endingReason: turn.endingReason,
        });

        await saveTurn(ctx, {
          turnIndex,
          childText,
          narration: turn.narration,
          choices: turn.choices,
          prevLatencyMs,
          childName: turn.childName,
        });

        console.log(
          `[story/turn] ep=${episodeId} turn=${turnIndex}${requestedTurnIndex === null ? "(auto)" : ""} ${Date.now() - t0}ms end=${turn.shouldEnd}`
        );
      } catch (err) {
        console.error("[story/turn] failed", err);
        send("error", { code: "STORY_FAILED", message: "치익… 신호가 잠깐 약해졌어요. 다시 한 번 말해 줄래요?" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
