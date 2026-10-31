// 자동 채점 실행기: 시나리오 실행 → 동화책 생성 → 코드 지표 + LLM 심사 → 집계. 소유: 역할 3. (개발 전용)
// 결과는 서버 메모리 + 저장소 루트의 .story-eval/<jobId>.json (스스로 git 무시)에 남는다.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEpisodeContext, saveTurn, type TurnRecord } from "../contextStore";
import { summarizeEpisode, type SummarizeEpisodeResult } from "../memorySummarizer";
import { generateTurn, isSafetyConcern } from "../storyEngine";
import { simulateChild } from "./childSim";
import { judgeEpisode, JUDGE_KEYS, type JudgeKey, type JudgeResult } from "./judge";
import {
  computeStorybookMetrics,
  computeTurnMetrics,
  type EvalTurn,
  type StorybookMetrics,
  type TurnMetrics,
} from "./metrics";
import { EVAL_SCENARIOS, type EvalScenario } from "./scenarios";

export interface ScenarioResult {
  id: string;
  title: string;
  age: number;
  seed: string | null;
  short: boolean;
  childName: string | null;
  turns: EvalTurn[];
  summary: Pick<SummarizeEpisodeResult, "storybookText" | "islandTitle" | "episodeTitle" | "worldMemory"> | null;
  summaryError?: string;
  summaryMs: number;
  turnMetrics: TurnMetrics;
  storyMetrics: StorybookMetrics | null;
  judge: JudgeResult | null;
}

export interface EvalJob {
  id: string;
  label: string;
  kind: "full" | "restory";
  from?: string;
  createdAt: string;
  finishedAt?: string;
  status: "running" | "done" | "error";
  error?: string;
  total: number;
  done: number;
  config: { judge: boolean; concurrency: number; only: string[] | null };
  results: ScenarioResult[];
  aggregate?: Aggregate;
}

const g = globalThis as unknown as { __storyEvalJobs?: Map<string, EvalJob> };
const jobs: Map<string, EvalJob> = g.__storyEvalJobs ?? (g.__storyEvalJobs = new Map());

const DIR = path.join(process.cwd(), ".story-eval");

async function persist(job: EvalJob): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(path.join(DIR, ".gitignore"), "*\n").catch(() => undefined);
    await writeFile(path.join(DIR, `${job.id}.json`), JSON.stringify(job, null, 1));
  } catch (err) {
    console.error("[eval] persist failed", err);
  }
}

export async function getJob(id: string): Promise<EvalJob | null> {
  const mem = jobs.get(id);
  if (mem) return mem;
  try {
    const job = JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")) as EvalJob;
    jobs.set(id, job);
    return job;
  } catch {
    return null;
  }
}

export async function listJobs(): Promise<{ id: string; label: string; status: string; done: number; total: number }[]> {
  const ids = new Set(jobs.keys());
  try {
    for (const f of await readdir(DIR)) if (f.endsWith(".json")) ids.add(f.slice(0, -5));
  } catch {
    /* 폴더 없음 */
  }
  const out = [];
  for (const id of [...ids].sort()) {
    const j = await getJob(id);
    if (j) out.push({ id: j.id, label: j.label, status: j.status, done: j.done, total: j.total });
  }
  return out;
}

function tag(n = 6): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

async function pool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ───────────────────────── 시나리오 실행 ─────────────────────────

async function runTurns(sc: EvalScenario): Promise<{ turns: EvalTurn[]; history: TurnRecord[]; childName: string | null }> {
  const ctx = await loadEpisodeContext(`mock-eval${tag(8)}-1`);
  ctx.seedPreset = sc.seed;
  ctx.childAge = sc.age;
  const turns: EvalTurn[] = [];
  const seedTurn = sc.short ? 2 : 3;

  for (let turnIndex = 0; turnIndex <= sc.lines.length; turnIndex++) {
    let childText = turnIndex === 0 ? "" : sc.lines[turnIndex - 1];
    const simulated = childText === "@";
    if (simulated) {
      const last = turns[turns.length - 1];
      childText = await simulateChild({
        age: sc.age,
        persona: sc.persona,
        history: ctx.history,
        lastNarration: last?.narration ?? "",
        lastChoices: last?.choices ?? [],
      });
    }
    const askName = turnIndex === 1 && !ctx.childName && ctx.episodeNumber <= 1;
    let mode: EvalTurn["mode"] =
      turnIndex === 0
        ? "opening"
        : askName
          ? "name"
          : isSafetyConcern(childText)
            ? "safety"
            : turnIndex === seedTurn // 부모 씨앗이 없으면 고전 동화 뼈대가 갈림길 장면이 된다
              ? "seed"
              : "normal";

    const t0 = Date.now();
    let error: string | undefined;
    let turn: Awaited<ReturnType<typeof generateTurn>> | null = null;
    for (let attempt = 0; attempt < 2 && !turn; attempt++) {
      try {
        turn = await generateTurn({
          ctx,
          childText,
          turnIndex,
          elapsedSeconds: Math.floor((Date.now() - ctx.startedAt) / 1000),
          short: sc.short,
        });
      } catch (err) {
        error = String(err).slice(0, 200);
      }
    }
    const ms = Date.now() - t0;
    if (!turn) {
      turns.push({ turnIndex, childText, simulated, narration: "", choices: [], shouldEnd: false, endingReason: null, mode, ms, error });
      continue;
    }
    if (turn.shouldEnd) mode = "ending";
    await saveTurn(ctx, {
      turnIndex,
      childText,
      narration: turn.narration,
      choices: turn.choices,
      prevLatencyMs: null,
      childName: turn.childName,
    });
    turns.push({
      turnIndex,
      childText,
      simulated,
      narration: turn.narration,
      choices: turn.choices,
      shouldEnd: turn.shouldEnd,
      endingReason: turn.endingReason,
      mode,
      ms,
    });
    if (turn.shouldEnd) break;
  }
  return { turns, history: ctx.history, childName: ctx.childName };
}

async function storyAndScore(
  sc: EvalScenario,
  turns: EvalTurn[],
  history: TurnRecord[],
  childName: string | null,
  judge: boolean
): Promise<ScenarioResult> {
  const s0 = Date.now();
  let summary: ScenarioResult["summary"] = null;
  let summaryError: string | undefined;
  try {
    const out = await summarizeEpisode({ turns: history, prevMemory: null, childName, episodeNumber: 1 });
    summary = {
      storybookText: out.storybookText,
      islandTitle: out.islandTitle,
      episodeTitle: out.episodeTitle,
      worldMemory: out.worldMemory,
    };
  } catch (err) {
    summaryError = String(err).slice(0, 200);
  }
  const summaryMs = Date.now() - s0;

  const storyMetrics = summary
    ? computeStorybookMetrics(summary.storybookText, turns, {
        mustNotContain: sc.mustNotContain,
        mustContain: sc.mustContain,
        memoryText: JSON.stringify(summary.worldMemory),
      })
    : null;

  const judged = judge
    ? await judgeEpisode({ age: sc.age, title: sc.title, turns, storybook: summary?.storybookText ?? "" })
    : null;

  return {
    id: sc.id,
    title: sc.title,
    age: sc.age,
    seed: sc.seed,
    short: Boolean(sc.short),
    childName,
    turns,
    summary,
    summaryError,
    summaryMs,
    turnMetrics: computeTurnMetrics(turns, childName),
    storyMetrics,
    judge: judged,
  };
}

function selectScenarios(only: string[] | null): EvalScenario[] {
  return only?.length ? EVAL_SCENARIOS.filter((s) => only.includes(s.id)) : EVAL_SCENARIOS;
}

function newJob(label: string, kind: EvalJob["kind"], total: number, config: EvalJob["config"], from?: string): EvalJob {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(4, 13).replace("T", "-");
  const job: EvalJob = {
    id: `${stamp}-${label.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "run"}-${tag(3)}`,
    label,
    kind,
    from,
    createdAt: new Date().toISOString(),
    status: "running",
    total,
    done: 0,
    config,
    results: [],
  };
  jobs.set(job.id, job);
  return job;
}

function finish(job: EvalJob, err?: unknown): void {
  job.results.sort((a, b) => a.id.localeCompare(b.id));
  job.aggregate = aggregate(job.results);
  job.status = err ? "error" : "done";
  if (err) job.error = String(err).slice(0, 300);
  job.finishedAt = new Date().toISOString();
  void persist(job);
}

/** 전체 실행: 턴 생성(가상 아이 포함) → 동화책 → 채점 */
export function startFullRun(opts: { label: string; judge: boolean; concurrency: number; only: string[] | null }): EvalJob {
  const scenarios = selectScenarios(opts.only);
  const job = newJob(opts.label, "full", scenarios.length, {
    judge: opts.judge,
    concurrency: opts.concurrency,
    only: opts.only,
  });
  void (async () => {
    try {
      await pool(scenarios, opts.concurrency, async (sc) => {
        try {
          const { turns, history, childName } = await runTurns(sc);
          job.results.push(await storyAndScore(sc, turns, history, childName, opts.judge));
        } catch (err) {
          console.error("[eval] scenario failed", sc.id, err);
        }
        job.done++;
        job.aggregate = aggregate(job.results);
        void persist(job);
      });
      finish(job);
    } catch (err) {
      finish(job, err);
    }
  })();
  return job;
}

/** 동화책만 다시: 이전 실행의 대화를 그대로 두고 동화책 생성·채점만 새로 (동화책 프롬프트 A/B용) */
export async function startRestory(opts: { from: string; label: string; judge: boolean; concurrency: number }): Promise<EvalJob | null> {
  const src = await getJob(opts.from);
  if (!src) return null;
  const job = newJob(opts.label, "restory", src.results.length, { judge: opts.judge, concurrency: opts.concurrency, only: null }, src.id);
  void (async () => {
    try {
      await pool(src.results, opts.concurrency, async (r) => {
        const sc = EVAL_SCENARIOS.find((s) => s.id === r.id);
        if (sc) {
          const history: TurnRecord[] = r.turns
            .filter((t) => !t.error)
            .map((t) => ({ childText: t.childText, narration: t.narration }));
          try {
            job.results.push(await storyAndScore(sc, r.turns, history, r.childName, opts.judge));
          } catch (err) {
            console.error("[eval] restory failed", r.id, err);
          }
        }
        job.done++;
        job.aggregate = aggregate(job.results);
        void persist(job);
      });
      finish(job);
    } catch (err) {
      finish(job, err);
    }
  })();
  return job;
}

/** 저장된 결과를 현재 심사 기준표로 다시 채점 */
export async function startRejudge(id: string, concurrency: number): Promise<EvalJob | null> {
  const job = await getJob(id);
  if (!job) return null;
  job.status = "running";
  job.done = 0;
  void (async () => {
    await pool(job.results, concurrency, async (r) => {
      // 지표 정의가 바뀌었을 수 있으니 코드 지표도 다시 계산
      const sc = EVAL_SCENARIOS.find((s) => s.id === r.id);
      r.turnMetrics = computeTurnMetrics(r.turns, r.childName);
      if (r.summary) {
        r.storyMetrics = computeStorybookMetrics(r.summary.storybookText, r.turns, {
          mustNotContain: sc?.mustNotContain,
          mustContain: sc?.mustContain,
          memoryText: JSON.stringify(r.summary.worldMemory),
        });
      }
      r.judge = await judgeEpisode({ age: r.age, title: r.title, turns: r.turns, storybook: r.summary?.storybookText ?? "" });
      job.done++;
      void persist(job);
    });
    job.config.judge = true;
    finish(job);
  })();
  return job;
}

// ───────────────────────── 집계 ─────────────────────────

export interface Aggregate {
  n: number;
  turns: Record<string, number | null>;
  story: Record<string, number | null>;
  judge: Record<string, number | null>;
}

function avg(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function aggregate(results: ScenarioResult[]): Aggregate {
  const tm = results.map((r) => r.turnMetrics);
  const sm = results.map((r) => r.storyMetrics).filter((m): m is StorybookMetrics => Boolean(m));
  const qTotal = sum(tm.map((m) => m.questionTurns));
  const q = (k: "choice" | "wh" | "yesno" | "none") => sum(tm.map((m) => m.qType[k]));
  const pct = (a: number) => (qTotal ? Math.round((a / qTotal) * 100) / 100 : null);

  const judge: Record<string, number | null> = {};
  for (const k of JUDGE_KEYS) judge[k] = avg(results.map((r) => r.judge?.scores[k as JudgeKey]));
  judge.Q_avg = avg(["QA", "QB", "QC", "QD", "QE", "QF"].map((k) => judge[k]));
  judge.S_avg = avg(["SA", "SB", "SC", "SD", "SE", "SF"].map((k) => judge[k]));

  return {
    n: results.length,
    turns: {
      questionTurns: qTotal,
      choiceRate: pct(q("choice")),
      whRate: pct(q("wh")),
      yesnoRate: pct(q("yesno")),
      noQuestionRate: pct(q("none")),
      maxConsecutiveYesno: tm.length ? Math.max(...tm.map((m) => m.maxConsecutiveYesno)) : null,
      multiQuestionTurns: sum(tm.map((m) => m.multiQuestionTurns)),
      fallbackQuestionUsed: sum(tm.map((m) => m.fallbackQuestionUsed)),
      avgSentences: avg(tm.map((m) => m.avgSentences)),
      longSentenceRate: avg(tm.map((m) => m.longSentenceRate)),
      politeRate: avg(tm.map((m) => m.politeRate)),
      banmalSentences: sum(tm.map((m) => m.banmalSentences)),
      nameStartTurns: sum(tm.map((m) => m.nameStartTurns)),
      praiseTurns: sum(tm.map((m) => m.praiseTurns)),
      realLifeQuestionTurns: sum(tm.map((m) => m.realLifeQuestionTurns)),
      morningMentions: sum(tm.map((m) => m.morningMentions)),
      childWordReflectedRate: avg(tm.map((m) => m.childWordReflectedRate)),
      dontKnowScaffoldRate: avg(tm.map((m) => m.dontKnowScaffoldRate)),
      aiDisclosedRate: avg(tm.map((m) => m.aiDisclosedRate)),
      safetyHandledRate: avg(tm.map((m) => m.safetyHandledRate)),
      choicesOkRate: avg(tm.map((m) => m.choicesOkRate)),
      avgTurnMs: avg(tm.map((m) => m.avgTurnMs)),
      maxTurnMs: tm.length ? Math.max(...tm.map((m) => m.maxTurnMs)) : null,
      errors: sum(tm.map((m) => m.errors)),
    },
    story: {
      made: sm.length,
      failed: results.length - sm.length,
      avgParagraphs: avg(sm.map((m) => m.paragraphs)),
      avgSentenceLen: avg(sm.map((m) => m.avgSentenceLen)),
      longSentenceRate: avg(sm.map((m) => m.longSentenceRate)),
      politeRate: avg(sm.map((m) => m.politeRate)),
      banmalSentences: sum(sm.map((m) => m.banmalSentences)),
      avgDialogue: avg(sm.map((m) => m.dialogueCount)),
      avgOnomatopoeia: avg(sm.map((m) => m.onomatopoeia)),
      refrainRate: avg(sm.map((m) => (m.refrain ? 1 : 0))),
      childVerbatimRate: avg(sm.map((m) => m.childVerbatimRate)),
      childReflectedRate: avg(sm.map((m) => m.childReflectedRate)),
      fabricatedChildQuotes: sum(sm.map((m) => m.fabricatedChildQuotes ?? 0)),
      endsWithQuestion: sum(sm.map((m) => (m.endsWithQuestion ? 1 : 0))),
      closingLineLeak: sum(sm.map((m) => (m.closingLineLeak ? 1 : 0))),
      nameQaLeak: sum(sm.map((m) => (m.nameQaLeak ? 1 : 0))),
      mustNotViolations: sum(sm.map((m) => m.mustNotViolations.length)),
      mustContainMissing: sum(sm.map((m) => m.mustContainMissing.length)),
      avgSummaryMs: avg(results.map((r) => r.summaryMs)),
    },
    judge,
  };
}

/** 상태 화면용 요약 (결과 전체는 detail로) */
export function jobOverview(job: EvalJob) {
  return {
    id: job.id,
    label: job.label,
    kind: job.kind,
    from: job.from,
    status: job.status,
    error: job.error,
    done: job.done,
    total: job.total,
    aggregate: job.aggregate ?? null,
    rows: [...job.results]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => ({
        id: r.id,
        title: r.title,
        name: r.childName,
        turns: r.turns.length,
        yesno: r.turnMetrics.qType.yesno,
        polite: r.turnMetrics.politeRate,
        sbPolite: r.storyMetrics?.politeRate ?? null,
        verbatim: r.storyMetrics?.childVerbatimRate ?? null,
        judge: r.judge?.scores ?? null,
        worst: r.judge?.worst ?? r.summaryError ?? "",
      })),
  };
}
