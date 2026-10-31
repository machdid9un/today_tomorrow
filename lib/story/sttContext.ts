// 음성 인식(STT) 품질 보조: 맥락 프롬프트 + 환각 문장 걸러내기. 소유: 역할 3 (역할 2의 /api/transcribe가 가져다 씀).
// - buildSttPrompt: 방금 이야기 용이 한 질문·보기·등장인물 이름을 STT에 힌트로 준다.
//   아이의 짧은 대답("별콩이!", "반딧불이")이나 지어낸 이름을 훨씬 잘 알아듣는다.
// - isLikelySttHallucination: 조용하거나 시끄러울 때 STT가 지어내는 문장("시청해 주셔서 감사합니다" 등)을 걸러 낸다.
import { loadEpisodeContext } from "./contextStore";
import { splitSentences } from "./storyEngine";
import { STT_COMMON_CORE, STT_COMMON_MORE, STT_NAME_HINTS, isNameQuestion } from "./sttVocab";
import { themeFor, themeSttWords } from "./themes";

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
  // ElevenLabs Scribe가 비음성 구간에 붙이는 영어 대괄호/괄호 태그(아이 말이 아니라 오디오 이벤트
  // 주석이다): [mumbling], (inaudible), [laughing], [background noise] 등. 태그 하나로만 된 줄 전체.
  /^\s*[\[(]\s*[a-zA-Z][a-zA-Z\s]{1,30}[\])]\s*$/,
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

// whisper-1은 prompt의 '뒤쪽' 약 224토큰만 쓴다(한국어는 글자당 토큰이 많음). 그래서 짧게 자르고,
// 덜 중요한 테마 낱말을 앞에, 가장 중요한 방금 질문·보기를 맨 뒤에 둔다.
const PROMPT_MAX = 260;

/**
 * STT 맥락 프롬프트 = 오늘의 별 낱말 + 아이 이름·등장인물 + 방금 질문 + 화면 보기.
 * OpenAI 전사 API의 prompt 필드에 그대로 넣는다(whisper-1, gpt-4o-mini-transcribe 모두 지원).
 * 실패해도 기본 문구는 돌려준다(전사를 막지 않음).
 */
export async function buildSttPrompt(
  episodeId: string | null | undefined,
  choices: string[] = [],
  themeId?: string | null
): Promise<string> {
  const base = "아이가 이야기 용과 놀며 짧게 대답한 말.";
  if (!episodeId) return base;
  try {
    const ctx = await loadEpisodeContext(episodeId);
    const theme = themeFor(episodeId, themeId ?? ctx.themeId);
    const last = ctx.history[ctx.history.length - 1]?.narration ?? "";
    const question = splitSentences(last).filter((s) => /\?/.test(s)).pop() ?? "";
    const names = [
      ctx.childName ? `${ctx.childName}` : "",
      ...(ctx.memory?.characters ?? []),
      ...(ctx.memory?.items ?? []),
      ...(ctx.planets[theme.id]?.collected ?? []).slice(-4), // 아이가 이 별에서 지은 이름·주문
    ]
      .map((s) => s.replace(/\(.*?\)/g, "").trim())
      .filter(Boolean)
      .slice(0, 6);
    const tail = [
      names.length ? `이름: ${names.join(", ")}.` : "",
      question ? `질문: ${question}` : "",
      choices.length ? `대답 예: ${choices.slice(0, 3).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    // 남는 자리만큼 테마 낱말을 앞에 채운다
    let head = `${base} 낱말: `;
    for (const w of themeSttWords(theme)) {
      if ((head + w + ", " + tail).length > PROMPT_MAX) break;
      head += `${w}, `;
    }
    return `${head.replace(/,\s*$/, ".")} ${tail}`.trim().slice(-PROMPT_MAX);
  } catch {
    return base;
  }
}

/**
 * ElevenLabs Scribe v2용 keyterms(낱말 목록). 배치: 최대 1,000개·각 50자·5단어 / 실시간: 최대 50개·각 20자.
 * 우선순위: 화면 보기 → (이름 묻는 턴이면) 흔한 이름 → 아이 이름·지난 이야기 인물·아이가 이 별에서 지은 이름
 *          → 이 별의 핵심 낱말 → 공통 대답 → 이 별의 그 밖 낱말 → 공통 그 밖.
 * 한 글자 낱말('위', '김', '꽃')은 엉뚱한 곳에 끼어들 수 있어 빼고, 프롬프트(buildSttPrompt)에서만 쓴다.
 */
export async function buildSttKeyterms(
  episodeId: string | null | undefined,
  choices: string[] = [],
  themeId?: string | null,
  realtime = false
): Promise<string[]> {
  const maxCount = realtime ? 50 : 150;
  const maxLen = realtime ? 20 : 50;
  const terms: string[] = [...choices];
  let theme = themeFor(episodeId ?? "", themeId);
  try {
    if (episodeId) {
      const ctx = await loadEpisodeContext(episodeId);
      theme = themeFor(episodeId, themeId ?? ctx.themeId);
      const last = ctx.history[ctx.history.length - 1]?.narration ?? "";
      if (isNameQuestion(last)) terms.push(...STT_NAME_HINTS);
      if (ctx.childName) terms.push(ctx.childName);
      terms.push(...(ctx.memory?.characters ?? []), ...(ctx.memory?.items ?? []));
      terms.push(...(ctx.planets[theme.id]?.collected ?? []));
    }
  } catch {
    /* 맥락을 못 읽어도 보기·별 낱말로 진행 */
  }
  terms.push(...themeSttWords(theme, true), ...STT_COMMON_CORE, ...themeSttWords(theme), ...STT_COMMON_MORE);
  const clean = terms
    .map((t) => t.replace(/\(.*?\)/g, "").replace(/[.?!,]/g, "").trim())
    .filter((t) => t.replace(/\s/g, "").length >= 2 && t.length <= maxLen && t.split(/\s+/).length <= 5);
  return [...new Set(clean)].slice(0, maxCount);
}
