export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOCK = ["무전기에서 지직 소리가 났어.", "저 멀리 노란 용이 손을 흔들고 있어.", "용한테 뭐라고 말해 볼까?"];

export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  const enc = new TextEncoder();
  const send = (event: string, data: unknown) =>
    enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(c) {
      for (let i = 0; i < MOCK.length; i++) {
        c.enqueue(send("sentence", { index: i, text: MOCK[i] }));
        await new Promise((r) => setTimeout(r, 300));
      }
      c.enqueue(send("turn_complete", { choices: ["인사하기", "숨어서 보기"], shouldEnd: false, endingReason: null }));
      c.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
