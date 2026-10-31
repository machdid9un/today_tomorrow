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
}

/** 응답은 왔지만 JSON으로 읽을 수 없을 때. raw로 일부를 살려 쓸 수 있다. */
export class LlmJsonError extends Error {
  constructor(
    public readonly raw: string,
    public readonly finishReason: string | null
  ) {
    super(`LLM_NOT_JSON (finish_reason=${finishReason ?? "?"}, len=${raw.length})`);
    this.name = "LlmJsonError";
  }
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
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
const globalForLlm = globalThis as unknown as { __llmModelCache?: ModelCache };
const modelCache: ModelCache =
  globalForLlm.__llmModelCache ?? (globalForLlm.__llmModelCache = new Map());

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
  useJsonMode: boolean
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
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
        ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function isModelRejected(status: number, detail: string): boolean {
  return (status === 403 || status === 404) && /model/i.test(detail);
}

/**
 * JSON 하나를 돌려받는 채팅 호출.
 * - JSON 모드가 거부(400/422)되면 JSON 모드 없이 1회 재시도
 * - 모델이 키 등급에 막히면(403/404) 허용 모델로 바꿔 1회 재시도
 * - 응답이 JSON이 아니면 LlmJsonError(raw 포함)를 던진다
 */
export async function chatJSON<T>(opts: ChatJSONOptions): Promise<T> {
  if (!hasLlmKey()) throw new Error("DEEPSEEK_API_KEY_MISSING");

  let model = modelCache.get(opts.model) ?? opts.model;
  let useJsonMode = true;
  let res = await callOnce(opts, model, useJsonMode);

  for (let attempt = 0; attempt < 2 && !res.ok; attempt++) {
    const detail = await res.clone().text().catch(() => "");
    if (useJsonMode && (res.status === 400 || res.status === 422) && !/model/i.test(detail)) {
      useJsonMode = false;
    } else if (isModelRejected(res.status, detail)) {
      const alt = pickModel(await listModels(), model);
      if (!alt || alt === model) break;
      console.warn(`[llm] model "${model}" rejected for this key → using "${alt}"`);
      modelCache.set(opts.model, alt);
      model = alt;
    } else {
      break;
    }
    res = await callOnce(opts, model, useJsonMode);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM_${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];
  const content = choice?.message?.content ?? "";
  try {
    return parseJSONLoose<T>(content);
  } catch {
    throw new LlmJsonError(content, choice?.finish_reason ?? null);
  }
}
