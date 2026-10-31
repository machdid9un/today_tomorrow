// 음성 인식(STT) 품질 보조: 맥락 프롬프트 + 환각 문장 걸러내기. 소유: 역할 3 (역할 2의 /api/transcribe가 가져다 씀).
// - buildSttPrompt: 방금 무전기가 한 질문·보기·등장인물 이름을 STT에 힌트로 준다.
//   아이의 짧은 대답("별콩이!", "반딧불이")이나 지어낸 이름을 훨씬 잘 알아듣는다.
// - isLikelySttHallucination: 조용하거나 시끄러울 때 STT가 지어내는 문장("시청해 주셔서 감사합니다" 등)을 걸러 낸다.
import { loadEpisodeContext } from "./contextStore";
import { splitSentences } from "./storyEngine";

const HALLUCINATION_PATTERNS: RegExp[] = [
  /시청\s*해\s*주셔서\s*감사/,
  /구독\s*(과|이랑|하고)?\s*좋아요/,
  /좋아요\s*(와|랑)?\s*구독/,
  /구독\s*부탁/,
  /(MBC|KBS|SBS|YTN|JTBC)\s*뉴스/i,
  /뉴스\s*[가-힣]{2,4}\s*입니다/,
  /자막\s*(제공|by|협찬)/i,
  /다음\s*(영상|시간)에\s*(만나|뵙)/,
  /^\s*[\[(]?\s*(음악|박수|웃음|music|applause)\s*[\])]?\s*$/i,
  /^[\s.♪~…·]*$/,
];

/** 아이 말이 아니라 STT가 지어낸 문장으로 보이면 true (빈 말로 취급할 것) */
export function isLikelySttHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (HALLUCINATION_PATTERNS.some((re) => re.test(t))) return true;
  if (/^감사합니다[.!]?$/.test(t)) return true; // 침묵에서 가장 흔한 환각
  // 같은 낱말이 5번 이상 되풀이되는 깨진 출력
  const words = t.split(/\s+/);
  if (words.length >= 5 && new Set(words).size <= 1) return true;
  return false;
}

const PROMPT_MAX = 400;

/**
 * STT 맥락 프롬프트. 마지막 무전기 질문 + 화면 보기 + 알려진 이름들.
 * OpenAI 전사 API의 prompt 필드에 그대로 넣는다(whisper-1, gpt-4o-mini-transcribe 모두 지원).
 * 실패하면 기본 문구만 돌려준다(전사를 막지 않음).
 */
export async function buildSttPrompt(episodeId: string | null | undefined, choices: string[] = []): Promise<string> {
  const base = "어린아이가 잠자리 무전기 놀이에서 짧게 대답하는 말입니다.";
  if (!episodeId) return base;
  try {
    const ctx = await loadEpisodeContext(episodeId);
    const last = ctx.history[ctx.history.length - 1]?.narration ?? "";
    const question = splitSentences(last).filter((s) => /\?/.test(s)).pop() ?? "";
    const names = [
      ctx.childName ? `${ctx.childName} 대장님` : "",
      ...(ctx.memory?.characters ?? []),
      ...(ctx.memory?.items ?? []),
    ]
      .map((s) => s.replace(/\(.*?\)/g, "").trim())
      .filter(Boolean)
      .slice(0, 8);
    const parts = [
      base,
      question ? `방금 질문: ${question}` : "",
      choices.length ? `보기: ${choices.slice(0, 3).join(", ")}` : "",
      names.length ? `이름: ${names.join(", ")}` : "",
    ].filter(Boolean);
    return parts.join(" ").slice(0, PROMPT_MAX);
  } catch {
    return base;
  }
}
