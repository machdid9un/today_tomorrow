// 결과 화면의 '내일 이야기에 마음 담기' 추천. 소유: 역할 3.
// 원칙: 진단·약점 찾기가 아니라 '오늘 아이가 한 말'에서 이어 갈 이야기를 권한다.
//  - 추천마다 근거(아이가 실제로 한 말)를 붙인다. 근거가 없으면 다른 마음 주제를 소개만 한다.
//  - LLM 없이 규칙으로 만든다(빠르고, 왜 나왔는지 설명할 수 있게).
//  - 방금 쓴 씨앗은 다시 권하지 않는다. 최대 2개. 부모는 고르지 않아도 된다.
import type { SeedPreset } from "@/types";
import type { TurnRecord } from "./contextStore";
import { hasPersonalInfo, isSafetyConcern } from "./safety";
import { SEED_OPTIONS, SEED_PRESET_PARENT_COPY, type SeedOption } from "./seedPresets";
import { isLikelySttHallucination } from "./sttContext";

export interface SeedSuggestion {
  preset: SeedOption;
  label: string;
  emoji: string;
  /** 부모에게 보여 줄 한 문장 (아이 말에서 나온 이유) */
  reason: string;
  /** 근거가 된 아이 말 원문 (없으면 null = 새로운 이야기 권유) */
  evidence: string | null;
}

interface Rule {
  preset: SeedOption;
  pattern: RegExp;
  reason: (quote: string) => string;
}

// 순서 = 우선순위. 아이가 스스로 꺼낸 마음(무서움·외로움·지침)을 먼저, 그다음 아이가 이미 보여 준 생각을 '알아봐 주기'로.
const RULES: Rule[] = [
  {
    preset: "courage",
    pattern: /(무서워|무섭|겁나|겁이\s*나|어두워|못\s*하겠|못\s*해|자신\s*없)/,
    reason: (q) => `“${q}”라고 말했어요. 내일은 용이 '할 수 있어용' 하고 곁에서 믿어 주는 이야기는 어떨까요? 무서우면 돌아가도 괜찮은 이야기예요.`,
  },
  {
    preset: "company",
    pattern: /(혼자|외로|보고\s*싶|같이\s*있|옆에\s*있|가지\s*마|무서워)/,
    reason: (q) => `“${q}”라고 말했어요. 내일은 용이 처음부터 끝까지 곁에 꼭 붙어 있는 이야기는 어떨까요?`,
  },
  {
    preset: "rest",
    pattern: /(졸려|피곤|힘들|그만|조용|쉬고\s*싶|하기\s*싫)/,
    reason: (q) => `“${q}”라고 말했어요. 내일은 사건 없이 느리고 포근한 이야기로 편히 쉬어 가 볼까요?`,
  },
  {
    preset: "praise",
    pattern: /(내가|이름은|할래|만들|섞어|주문|도와|같이\s*하|번갈아|칠해)/,
    reason: (q) => `“${q}”처럼 자기 생각을 이야기에 보탰어요. 내일은 용이 그 생각이 만든 변화를 알아봐 주는 이야기는 어떨까요?`,
  },
];

const FRESH_REASON: Record<SeedOption, string> = {
  courage: "이런 마음도 담아 볼 수 있어요. 용이 '할 수 있어용' 하고 믿어 주는 이야기예요.",
  praise: "이런 마음도 담아 볼 수 있어요. 용이 아이의 생각이 만든 변화를 알아봐 주는 이야기예요.",
  company: "이런 마음도 담아 볼 수 있어요. 용이 처음부터 끝까지 곁에 있어 주는 이야기예요.",
  rest: "이런 마음도 담아 볼 수 있어요. 사건 없이 느리고 포근하게 쉬어 가는 이야기예요.",
};

function quotable(text: string): boolean {
  const t = text.trim();
  return Boolean(t) && !isSafetyConcern(t) && !hasPersonalInfo(t) && !isLikelySttHallucination(t);
}

function shortQuote(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return Array.from(t).length > 24 ? `${Array.from(t).slice(0, 24).join("")}…` : t;
}

/**
 * 오늘 대화에서 다음 씨앗 1~2개를 권한다.
 * @param turns 이번 회차 턴 기록 (turn 1이 이름 답이면 nameAnswerIndex로 빼기)
 * @param usedSeed 이번 회차에 쓴 씨앗 (다시 권하지 않음)
 */
export function recommendSeeds(
  turns: TurnRecord[],
  usedSeed: SeedPreset | null,
  nameAnswerIndex: number | null = 1
): SeedSuggestion[] {
  const said = turns
    .map((t, i) => (i === nameAnswerIndex ? "" : t.childText ?? ""))
    .filter(quotable);
  const out: SeedSuggestion[] = [];
  const taken = new Set<string>(usedSeed ? [usedSeed] : []);

  for (const rule of RULES) {
    if (out.length >= 2) break;
    if (taken.has(rule.preset)) continue;
    const hit = said.find((s) => rule.pattern.test(s));
    if (!hit) continue;
    const copy = SEED_PRESET_PARENT_COPY[rule.preset];
    const quote = shortQuote(hit);
    out.push({ preset: rule.preset, label: copy.label, emoji: copy.emoji, reason: rule.reason(quote), evidence: hit.trim() });
    taken.add(rule.preset);
  }
  // 근거 있는 추천이 모자라면 다른 마음 담기 소개로 채운다 (정해진 순서로 돌아가며)
  for (const preset of SEED_OPTIONS) {
    if (out.length >= 2) break;
    if (taken.has(preset)) continue;
    const copy = SEED_PRESET_PARENT_COPY[preset];
    out.push({ preset, label: copy.label, emoji: copy.emoji, reason: FRESH_REASON[preset], evidence: null });
    taken.add(preset);
  }
  return out;
}
