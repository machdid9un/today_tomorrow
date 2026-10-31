// 오늘의 씨앗: 부모가 고르는 '마음 주제' → 아이 모험 속 갈림길 장면. 소유: 역할 3.
// 원칙(부모 감시 도구가 되지 않게):
//  - 부모는 정해진 몇 가지 '마음 주제'만 고른다. 자유 입력은 기본으로 막는다(ALLOW_CUSTOM_SEED=1일 때만).
//  - 아이에게 현실을 묻지 않는다. 장면은 언제나 판타지이고, 아이의 선택이 정답이다(잘잘못 평가 없음).
//  - 혼내기·벌·교훈 낭독 없이, 어떤 선택이든 포근하게 이어 간다.
//  - 씨앗은 한 번의 이야기에만 쓴다(회차 종료 시 비우는 건 역할 1의 complete 담당).
import type { SeedPreset } from "@/types";
import { chatJSON, hasLlmKey, STORY_MODEL } from "./llm";

export type SeedOption = Exclude<SeedPreset, "custom">;

/** 부모 화면에 보여 줄 순서 */
export const SEED_OPTIONS: SeedOption[] = ["kindness", "courage", "promise", "share", "new_place", "retry"];

export const SEED_PRESET_SCENE_DIRECTIVES: Record<SeedOption, string> = {
  kindness:
    "지금까지 이야기에 나온 친구(없으면 방금 만난 새 친구) 하나가 다쳐서 천천히 걸을 수밖에 없는데, 저 멀리 출발하려는 배(또는 로켓)가 보이는 갈림길 장면. 새 인물을 갑자기 만들지 말고 이미 나온 친구를 쓴다. 그 친구 곁에 남을지, 먼저 갈지 아이가 고르게 한다. 어느 쪽을 골라도 이야기는 따뜻하게 이어간다.",
  courage:
    "지금 함께 있는 친구와 조금 어둡고 낯선 곳(동굴 입구, 흔들다리) 앞에 선 장면. 무서운 묘사 없이, 들어가기 전에 무엇을 챙기면 마음이 든든할지(반짝이 불빛 / 친구 손잡기) 구체적인 두 가지로 고르게 한다. 한 걸음 내디딘 순간을 반갑게 그리고, 무섭다고 하면 '돌아가도 괜찮아요'라며 다른 길을 함께 찾는다.",
  promise:
    "이 별에 '달빛이 노래할 때까지 다리를 건너지 않기' 같은 모두의 약속이 있는데, 지금 함께 있는 친구가 빨리 건너고 싶어 조르는 장면. 친구와 기다리며 무엇을 할지(별 세기 / 노래 부르기) 아이가 고르게 한다. 약속을 어기면 혼나는 이야기로 만들지 않는다. 기다린 덕분에 더 멋진 걸 보게 되거나, 다 같이 약속을 다시 정하는 식으로 포근하게 이어 간다. 교훈은 말로 하지 않는다.",
  share:
    "지금 함께 있는 친구의 작고 서툰 아기 동생이 모험에 졸졸 따라오는 장면. 찾은 보물(간식이나 반짝이는 돌)을 그 아기 동생과 나눌지, 아이가 간직할지 고르게 한다. 어느 쪽이든 탓하지 않고 따뜻하게 이어 간다. 실제 형제 이야기는 꺼내지 않는다.",
  new_place:
    "지금 함께 있는 친구와 처음 가 보는 옆 별(또는 이 별의 작은 학교)에 막 도착한 장면. 낯선 친구들이 멀리서 수줍게 쳐다보고 있고, 먼저 어떻게 인사할지(손 흔들기 / 작은 선물 주기) 아이가 고르게 한다. 실제 이사·전학·학교 이야기는 꺼내지 않는다.",
  retry:
    "지금 함께 있는 친구가 무언가(종이배 접기, 별 모양 쿠키 굽기)를 하다 실수해서 속상해하는 장면. 다시 해 볼 방법 두 가지(예: 천천히 한 번 더 / 같이 손잡고 해 보기) 중 아이가 고르게 한다. 실수를 탓하지 않고, 다시 해 보는 순간을 반갑게 그린다.",
};

/** 부모 화면 문구: 이름·아이콘·이런 날·아이에게는 이런 장면 */
export const SEED_PRESET_PARENT_COPY: Record<SeedOption, { label: string; emoji: string; when: string; scene: string }> = {
  kindness: { label: "친구 곁에 있어 주기", emoji: "🤝", when: "함께하는 마음을 이야기해 보고 싶을 때", scene: "다친 친구 곁에 남을지, 먼저 떠나는 배를 탈지 고르는 장면" },
  courage: { label: "용기 내기", emoji: "🔦", when: "새로운 걸 무서워하거나 망설일 때", scene: "조금 어두운 동굴 앞에서 무엇을 챙기면 든든할지 고르는 장면 (돌아가도 괜찮아요)" },
  promise: { label: "약속 지키기", emoji: "🌙", when: "요즘 약속이나 규칙 때문에 자주 부딪힐 때", scene: "모두의 약속 앞에서 조르는 친구가 기다리도록 아이가 도와주는 장면 (혼내거나 가르치지 않아요)" },
  share: { label: "나누는 마음", emoji: "🍪", when: "동생·친구와 나누기를 어려워할 때", scene: "졸졸 따라온 아기 동생과 찾은 보물을 나눌지 고르는 장면" },
  new_place: { label: "새로운 곳·새 친구", emoji: "🏝️", when: "새 학기나 낯선 곳을 앞두고 있을 때", scene: "처음 가 보는 별의 친구들에게 어떻게 인사할지 고르는 장면" },
  retry: { label: "실수해도 다시", emoji: "🌱", when: "실수하면 속상해하거나 쉽게 포기할 때", scene: "실수해서 속상한 친구와 다시 해 볼 방법을 고르는 장면" },
};

/** 씨앗 선택 화면에 함께 보여 줄 약속 (부모 개입의 한계를 분명히) */
export const SEED_GUARDRAILS = [
  "아이에게 현실 이야기를 묻지 않아요. 판타지 장면 하나로만 나와요.",
  "아이의 선택이 정답이에요. 잘했다·못했다로 평가하지 않아요.",
  "혼내거나 교훈을 말하지 않고, 어떤 선택이든 포근하게 이어져요.",
  "씨앗은 한 번의 이야기에만 쓰여요.",
];

const SEED_PRESETS_ALL: SeedPreset[] = [...SEED_OPTIONS, "custom"];

/** 자유 입력 씨앗 허용 여부 (기본 꺼짐: 부모가 원하는 대로 아이를 조종하는 도구가 되지 않게) */
export function customSeedAllowed(): boolean {
  return process.env.ALLOW_CUSTOM_SEED === "1";
}

/** 저장 API용 입력 검증. 잘못된 값이면 null. 빈 값은 씨앗 지우기. */
export function parseSeedInput(
  preset: unknown,
  text: unknown
): { preset: SeedPreset | null; text: string | null } | null {
  if (preset === null || preset === undefined || preset === "") return { preset: null, text: null };
  if (typeof preset !== "string" || !(SEED_PRESETS_ALL as string[]).includes(preset)) return null;
  if (preset !== "custom") return { preset: preset as SeedPreset, text: null };
  if (!customSeedAllowed()) return null;
  const t = typeof text === "string" ? text.trim().slice(0, 300) : "";
  return t ? { preset: "custom", text: t } : null;
}

const FREE_TEXT_SYSTEM = `부모가 아이와 함께 이야기해 보고 싶은 주제를 적었다. 이것을 아이 잠자리 모험 속 '한 장면 지시문'으로 바꿔라.
규칙:
- 1~2문장. 판타지 모험 속 상징적인 장면으로만 표현한다.
- 부모 원문의 실제 사람 이름, 학교·학원 이름, 병명, 구체적 사건은 쓰지 않는다.
- 아이가 장면 안에서 무언가를 고를 수 있게 한다.
- 아이에게 현실을 묻는 장면은 만들지 않는다. 무섭거나 슬픈 장면은 만들지 않는다.
- 교훈을 말로 하지 않는다. 장면 속 결과로만 보여 준다.
예) 부모: "동생이 생겨서 질투를 해요" → {"directive": "함께 다니던 친구에게 아주 작은 아기 동생이 생겨 모두가 아기만 바라보는 장면. 아이가 아기에게 무엇을 해 줄지(자장가 불러 주기 / 반짝이 돌 보여 주기) 고르게 한다."}
예) 부모: "엄마 아빠가 자주 다퉈서 불안해해요" → {"directive": "별의 두 등대지기가 불빛 색깔 때문에 투닥거려 별이 깜빡깜빡 어지러운 장면. 아이가 두 등대지기를 위해 무엇을 할지(두 불빛을 섞어 보기 / 함께 노래 부르기) 고르게 하고, 두 등대지기는 금세 화해해 함께 별을 비춘다."}
출력: {"directive": "..."} JSON 하나만.`;

/** 자유 입력 씨앗 → 장면 지시문. 실패하면 빈 문자열(씨앗 장면을 건너뜀). */
export async function convertFreeTextSeedToDirective(
  rawText: string
): Promise<string> {
  const text = rawText.trim().slice(0, 300);
  if (!text || !hasLlmKey()) return "";
  try {
    const out = await chatJSON<{ directive?: unknown }>({
      model: STORY_MODEL,
      messages: [
        { role: "system", content: FREE_TEXT_SYSTEM },
        { role: "user", content: `부모가 적은 주제: ${text}` },
      ],
      maxTokens: 400,
      temperature: 0.5,
      timeoutMs: 8000,
      thinking: false,
    });
    return typeof out.directive === "string" ? out.directive.trim() : "";
  } catch (err) {
    console.error("[seed] free-text conversion failed", err);
    return "";
  }
}

/** world의 씨앗 설정 → 이번 회차에 쓸 장면 지시문 (없으면 null). */
export async function resolveSeedDirective(
  preset: SeedPreset | null,
  text: string | null
): Promise<string | null> {
  if (!preset) return null;
  if (preset === "custom") {
    if (!customSeedAllowed()) return null;
    const directive = await convertFreeTextSeedToDirective(text ?? "");
    return directive || null;
  }
  return SEED_PRESET_SCENE_DIRECTIVES[preset] ?? null;
}
