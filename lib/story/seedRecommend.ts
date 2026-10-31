// 결과 화면의 '다음 씨앗 추천'. 소유: 역할 3.
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

// 순서 = 우선순위. 아이가 스스로 꺼낸 마음(무서움)을 먼저, 그다음 아이가 이미 보여 준 좋은 마음을 '이어 가기'로.
const RULES: Rule[] = [
  {
    preset: "courage",
    pattern: /(무서워|무섭|겁나|겁이\s*나|어두워)/,
    reason: (q) => `“${q}”라고 말했어요. 다음엔 든든한 친구와 함께 한 걸음 내디뎌 보는 이야기는 어떨까요? 무서우면 돌아가도 괜찮은 이야기예요.`,
  },
  {
    preset: "share",
    pattern: /(나눠|나누|나눌|줄래|줄게|같이\s*먹|양보|반\s*쪽)/,
    reason: (q) => `“${q}”라며 나누는 마음을 보였어요. 나누는 즐거움을 한 번 더 이어 가 볼까요?`,
  },
  {
    preset: "kindness",
    pattern: /(도와|구해|곁에|옆에\s*있|안아|괜찮아|기다려\s*줄|지켜)/,
    reason: (q) => `“${q}”라며 친구를 챙겼어요. 친구 곁에 있어 주는 이야기로 그 마음을 이어 가 볼까요?`,
  },
  {
    preset: "new_place",
    pattern: /(가\s*볼래|가\s*보자|가자|탐험|처음|새로운|인사)/,
    reason: (q) => `“${q}”라며 새로운 곳에 호기심을 보였어요. 처음 가 보는 곳의 친구를 만나는 이야기는 어떨까요?`,
  },
  {
    preset: "retry",
    pattern: /(다시|한\s*번\s*더|또\s*해)/,
    reason: (q) => `“${q}”라고 했어요. 실수해도 다시 해 보는 이야기로 그 마음을 이어 가 볼까요?`,
  },
];

const FRESH_REASON: Record<SeedOption, string> = {
  kindness: "이런 이야기도 골라 볼 수 있어요. 다친 친구 곁에 있어 주는 장면을 만나요.",
  courage: "이런 이야기도 골라 볼 수 있어요. 조금 어두운 길 앞에서 든든한 걸 챙겨 보는 장면을 만나요.",
  promise: "이런 이야기도 골라 볼 수 있어요. 모두의 약속을 앞둔 친구를 도와주는 장면을 만나요.",
  share: "이런 이야기도 골라 볼 수 있어요. 아기 동생과 보물을 나눌지 고르는 장면을 만나요.",
  new_place: "이런 이야기도 골라 볼 수 있어요. 처음 가 보는 곳의 친구들에게 인사하는 장면을 만나요.",
  retry: "이런 이야기도 골라 볼 수 있어요. 실수해서 속상한 친구와 다시 해 보는 장면을 만나요.",
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
  // 근거 있는 추천이 모자라면 다른 마음 주제 소개로 채운다 (정해진 순서로 돌아가며)
  for (const preset of SEED_OPTIONS) {
    if (out.length >= 2) break;
    if (taken.has(preset)) continue;
    const copy = SEED_PRESET_PARENT_COPY[preset];
    out.push({ preset, label: copy.label, emoji: copy.emoji, reason: FRESH_REASON[preset], evidence: null });
    taken.add(preset);
  }
  return out;
}
