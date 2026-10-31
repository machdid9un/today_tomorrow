// GET /api/story/eval — 시나리오 30개 자동 채점 (역할 3 개발 전용). 소유: 역할 3.
// 로컬 개발 서버(npm run dev) 또는 STORY_SELFTEST=1 에서만 동작. 운영 배포에서는 404.
//
//   ?action=start&label=baseline[&judge=0][&concurrency=3][&only=s01,s02]   전체 실행(백그라운드) → jobId
//   ?action=restory&from=<jobId>&label=v2                                     같은 대화로 동화책만 다시 생성·채점
//   ?action=rejudge&job=<jobId>                                               저장된 결과를 다시 채점
//   ?action=status&job=<jobId>                                                진행률·집계·시나리오별 요약
//   ?action=detail&job=<jobId>&id=s01                                         시나리오 하나 전체(대화·동화책·지표)
//   ?action=list                                                              실행 목록
//   ?action=compare&a=<jobId>&b=<jobId>                                       두 실행의 집계 비교
import {
  getJob,
  jobOverview,
  listJobs,
  startFullRun,
  startRejudge,
  startRestory,
} from "@/lib/story/eval/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function int(v: string | null, def: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : def;
}

export async function GET(request: Request) {
  const enabled = process.env.NODE_ENV === "development" || process.env.STORY_SELFTEST === "1";
  if (!enabled) return new Response("Not Found", { status: 404 });

  const url = new URL(request.url);
  const q = (k: string) => url.searchParams.get(k);
  const action = q("action") ?? "list";
  const concurrency = int(q("concurrency"), 3, 1, 6);
  const judge = q("judge") !== "0";

  switch (action) {
    case "start": {
      const only = q("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
      const job = startFullRun({ label: q("label") ?? "run", judge, concurrency, only });
      return Response.json({ ok: true, job: job.id, total: job.total });
    }
    case "restory": {
      const from = q("from");
      if (!from) return Response.json({ ok: false, error: "from이 필요합니다." }, { status: 400 });
      const job = await startRestory({ from, label: q("label") ?? "restory", judge, concurrency });
      if (!job) return Response.json({ ok: false, error: "원본 실행을 찾을 수 없습니다." }, { status: 404 });
      return Response.json({ ok: true, job: job.id, total: job.total });
    }
    case "rejudge": {
      const job = await startRejudge(q("job") ?? "", concurrency);
      if (!job) return Response.json({ ok: false, error: "실행을 찾을 수 없습니다." }, { status: 404 });
      return Response.json({ ok: true, job: job.id });
    }
    case "status": {
      const job = await getJob(q("job") ?? "");
      if (!job) return Response.json({ ok: false, error: "실행을 찾을 수 없습니다." }, { status: 404 });
      return Response.json({ ok: true, ...jobOverview(job) });
    }
    case "detail": {
      const job = await getJob(q("job") ?? "");
      const r = job?.results.find((x) => x.id === q("id"));
      if (!r) return Response.json({ ok: false, error: "결과를 찾을 수 없습니다." }, { status: 404 });
      return Response.json({ ok: true, result: r });
    }
    case "compare": {
      const [a, b] = await Promise.all([getJob(q("a") ?? ""), getJob(q("b") ?? "")]);
      if (!a || !b) return Response.json({ ok: false, error: "실행을 찾을 수 없습니다." }, { status: 404 });
      return Response.json({
        ok: true,
        a: { id: a.id, label: a.label, aggregate: a.aggregate },
        b: { id: b.id, label: b.label, aggregate: b.aggregate },
      });
    }
    default:
      return Response.json({ ok: true, jobs: await listJobs() });
  }
}
