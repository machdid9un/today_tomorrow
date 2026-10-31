// LLM 호출 헬퍼 (OpenAI 호환, SDK 없이 fetch). 소유: 역할 3.
// 해커톤 제공: 래블업 Token Factory(Continuum Hub)가 DeepSeek 모델을 호스팅.
//   POST https://api.console.lablup.ai/v1/chat/completions
// 팀 키 등급(tier)에 따라 쓸 수 있는 모델이 다르다. 요청한 모델이 거부되면(403/404)
// /v1/models 목록에서 가장 비슷한 모델을 골라 한 번 재시도하고, 그 선택을 기억한다.
// 서버 전용. 키(DEEPSEEK_API_KEY, chk_로 시작)는 절대 클라이언트로 보내지 않는다.
// 필요하면 .env.local에서 DEEPSEEK_BASE_URL / LLM_STORY_MODEL / LLM_REPORT_MODEL로 바꿀 수 있다.

const DEFAULT_BASE_URL = "https://api.console.lablup.ai/v1";
const DEFAULT_MODEL = "DeepSeek-V4.1-Flash-B300"; // 팀 키(hackathon tier)에서 허용된 모델

export const STORY_MODEL = process.env.LLM_STORY_MODEL || DEFAULT_MODEL; // 턴: 빠른 응답
export const REPORT_MODEL = process.env.LLM_REPORT_MODEL || DEFAULT_MODEL; // 노트·기억 요약

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatJSONOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** false면 모델의 추론(생각) 단계를 끈다. 실시간 턴처럼 빠른 응답이 필요할 때. 기본은 켬. */
  thinking?: boolean;
  /** 이 시간(ms) 안에 응답이 없으면 같은 요청을 하나 더 보내고 먼저 온 응답을 쓴다(꼬리 지연 줄이기). */
  hedgeAfterMs?: number;
}

interface CallFlags {
  json: boolean;
  noThink: boolean;
}

/** 응답은 왔지만 JSON으로 읽을 수 없을 때. raw로 일부를 살려 쓸 수 있다. */
export class LlmJsonError extends Error {
  constructor(
    public readonly raw: string,
    public readonly finishReason: string | null,
    public readonly reasoningChars = 0
  ) {
    super(
      `LLM_NOT_JSON (finish_reason=${finishReason ?? "?"}, len=${raw.length}, reasoning=${reasoningChars})`
    );
    this.name = "LlmJsonError";
  }
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/**
 * 로컬 디버그용: 매 LLM 호출의 입력 프롬프트(messages)와 출력(raw content)을 서버 터미널에 찍는다.
 * 기본값은 개발 서버(npm run dev)에서는 켜짐, 배포본(NODE_ENV=production)에서는 꺼짐.
 * .env.local에 STORY_PROMPT_LOG=0 / =1 로 직접 끄거나 켤 수 있다.
 */
function promptLogEnabled(): boolean {
  if (process.env.STORY_PROMPT_LOG === "0") return false;
  if (process.env.STORY_PROMPT_LOG === "1") return true;
  return process.env.NODE_ENV === "development";
}

function logPrompt(model: string, messages: ChatMessage[]): void {
  if (!promptLogEnabled()) return;
  console.log(`\n┌── [llm:prompt] model=${model} ──────────────────────────`);
  for (const m of messages) {
    console.log(`│ [${m.role}]`);
    for (const line of m.content.split("\n")) console.log(`│   ${line}`);
  }
  console.log(`└──────────────────────────────────────────────────────────`);
}

function logOutput(content: string): void {
  if (!promptLogEnabled()) return;
  console.log(`[llm:output] ${content}\n`);
}

function baseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  };
}

/** LLM 응답 텍스트에서 JSON 객체 하나를 꺼낸다. ```json 펜스나 앞뒤 잡담이 있어도 처리. */
export function parseJSONLoose<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("NO_JSON_OBJECT");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

// ───────────── 모델 자동 선택 (키 등급에 맞춰) ─────────────

type ModelCache = Map<string, string>;

/** 호출별 진단 기록 (자가 테스트에서 지연·추론 토큰 확인용). 최근 50개만 보관. */
export interface LlmCallStats {
  model: string;
  ms: number;
  finishReason: string | null;
  contentChars: number;
  reasoningChars: number;
  completionTokens: number | null;
  reasoningTokens: number | null;
}

const globalForLlm = globalThis as unknown as {
  __llmModelCache?: ModelCache;
  __llmStats?: LlmCallStats[];
  __llmExtraBody?: Record<string, unknown> | null;
};
const modelCache: ModelCache =
  globalForLlm.__llmModelCache ?? (globalForLlm.__llmModelCache = new Map());
const statsLog: LlmCallStats[] = globalForLlm.__llmStats ?? (globalForLlm.__llmStats = []);

/** 지금까지 쌓인 진단 기록을 꺼내고 비운다. */
export function drainLlmStats(): LlmCallStats[] {
  return statsLog.splice(0, statsLog.length);
}

/** 실험용: 요청 본문에 덧붙일 필드 (예: 추론 끄기). 개발 서버 자가 테스트에서만 설정한다. */
export function setLlmExtraBody(extra: Record<string, unknown> | null): void {
  globalForLlm.__llmExtraBody = extra;
}

function extraBody(): Record<string, unknown> {
  if (globalForLlm.__llmExtraBody) return globalForLlm.__llmExtraBody;
  const raw = process.env.LLM_EXTRA_BODY;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function listModels(): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl()}/models`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id?: unknown }[] };
    return (data.data ?? [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** 거부된 모델 대신 쓸 모델: 같은 이름 → 이름 일부 포함 → DeepSeek 계열 → 첫 번째. */
export function pickModel(models: string[], requested: string): string | null {
  const lower = (s: string) => s.toLowerCase();
  const tail = lower(requested.split("/").pop() ?? requested).replace(/-b\d+$/, "");
  return (
    models.find((m) => lower(m) === lower(requested)) ??
    models.find((m) => lower(m).includes(tail)) ??
    models.find((m) => /deepseek.*flash/i.test(m)) ??
    models.find((m) => /deepseek/i.test(m)) ??
    models[0] ??
    null
  );
}

async function callOnce(
  opts: ChatJSONOptions,
  model: string,
  flags: CallFlags,
  external?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  const onExternalAbort = () => controller.abort();
  external?.addEventListener("abort", onExternalAbort);
  try {
    return await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.7,
        stream: false,
        ...(flags.json ? { response_format: { type: "json_object" } } : {}),
        // 래블업(DeepSeek 채팅 템플릿)에서 추론 끄기. 거부되면 chatJSON이 이 옵션 없이 재시도한다.
        ...(flags.noThink ? { chat_template_kwargs: { thinking: false } } : {}),
        ...extraBody(),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }
}

/** hedgeAfterMs가 있으면: 첫 요청이 그 시간 안에 안 끝나면 두 번째를 보내 먼저 끝난 쪽을 쓴다. */
async function callHedged(opts: ChatJSONOptions, model: string, flags: CallFlags): Promise<Response> {
  const hedgeAfter = opts.hedgeAfterMs;
  if (!hedgeAfter) return callOnce(opts, model, flags);

  const first = new AbortController();
  const second = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hedged = false;

  const p1 = callOnce(opts, model, flags, first.signal).then((r) => ({ r, who: 1 as const }));
  const p2 = new Promise<{ r: Response; who: 2 }>((resolve, reject) => {
    timer = setTimeout(() => {
      hedged = true;
      callOnce(opts, model, flags, second.signal).then((r) => resolve({ r, who: 2 }), reject);
    }, hedgeAfter);
  });

  try {
    const winner = await Promise.any([p1, p2]);
    (winner.who === 1 ? second : first).abort();
    if (hedged) console.log(`[llm] hedged request: #${winner.who} answered first`);
    return winner.r;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isModelRejected(status: number, detail: string): boolean {
  return (status === 403 || status === 404) && /model/i.test(detail);
}

/**
 * JSON 하나를 돌려받는 채팅 호출.
 * - 추론 끄기·JSON 모드가 거부(400/422)되면 그 옵션을 빼고 재시도
 * - 모델이 키 등급에 막히면(403/404) 허용 모델로 바꿔 1회 재시도
 * - 응답이 JSON이 아니면 LlmJsonError(raw 포함)를 던진다
 */
export async function chatJSON<T>(opts: ChatJSONOptions): Promise<T> {
  if (!hasLlmKey()) throw new Error("DEEPSEEK_API_KEY_MISSING");

  const startedAt = Date.now();
  let model = modelCache.get(opts.model) ?? opts.model;
  const flags: CallFlags = { json: true, noThink: opts.thinking === false };
  logPrompt(model, opts.messages);
  let res = await callHedged(opts, model, flags);

  for (let attempt = 0; attempt < 3 && !res.ok; attempt++) {
    const detail = await res.clone().text().catch(() => "");
    const badRequest = (res.status === 400 || res.status === 422) && !/model/i.test(detail);
    if (badRequest && flags.noThink) {
      flags.noThink = false; // 추론 끄기 옵션을 모르는 서버
    } else if (badRequest && flags.json) {
      flags.json = false; // JSON 모드를 모르는 서버
    } else if (res.status === 429 || res.status >= 500) {
      // 분당 요청 한도(429)·일시 오류: Retry-After(최대 4초)나 짧은 지수 대기 후 재시도
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 4000)
        : 600 * 2 ** attempt + Math.floor(Math.random() * 400);
      console.warn(`[llm] ${res.status} → ${waitMs}ms 후 재시도 (${attempt + 1}/3)`);
      await new Promise((r) => setTimeout(r, waitMs));
    } else if (isModelRejected(res.status, detail)) {
      const alt = pickModel(await listModels(), model);
      if (!alt || alt === model) break;
      console.warn(`[llm] model "${model}" rejected for this key → using "${alt}"`);
      modelCache.set(opts.model, alt);
      model = alt;
    } else {
      break;
    }
    res = await callOnce(opts, model, flags);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM_${res.status}: ${detail.slice(0, 200)}`);
  }

  let parsed = await readCompletion(res);

  // 추론(생각) 토큰이 한도를 다 써서 본문이 비었으면 한도를 2배로 늘려 1회 재시도
  if (!parsed.content.trim() && parsed.finishReason === "length") {
    const bigger = Math.min((opts.maxTokens ?? 600) * 2, 8000);
    console.warn(
      `[llm] empty content at max_tokens=${opts.maxTokens ?? 600} (reasoning=${parsed.reasoningChars} chars) → retry with ${bigger}`
    );
    const retry = await callOnce({ ...opts, maxTokens: bigger }, model, flags);
    if (retry.ok) parsed = await readCompletion(retry);
  }
  logOutput(parsed.content);

  statsLog.push({
    model,
    ms: Date.now() - startedAt,
    finishReason: parsed.finishReason,
    contentChars: parsed.content.length,
    reasoningChars: parsed.reasoningChars,
    completionTokens: parsed.completionTokens,
    reasoningTokens: parsed.reasoningTokens,
  });
  if (statsLog.length > 50) statsLog.splice(0, statsLog.length - 50);

  try {
    return parseJSONLoose<T>(parsed.content);
  } catch {
    throw new LlmJsonError(parsed.content, parsed.finishReason, parsed.reasoningChars);
  }
}

async function readCompletion(res: Response): Promise<{
  content: string;
  finishReason: string | null;
  reasoningChars: number;
  completionTokens: number | null;
  reasoningTokens: number | null;
}> {
  const data = (await res.json()) as {
    choices?: {
      message?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null };
      finish_reason?: string;
    }[];
    usage?: {
      completion_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };
  const choice = data.choices?.[0];
  const reasoning = choice?.message?.reasoning_content ?? choice?.message?.reasoning ?? "";
  return {
    content: choice?.message?.content ?? "",
    finishReason: choice?.finish_reason ?? null,
    reasoningChars: reasoning.length,
    completionTokens: data.usage?.completion_tokens ?? null,
    reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens ?? null,
  };
}
