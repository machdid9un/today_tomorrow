// 내일 이야기에 마음 담기(= 오늘의 씨앗): 부모가 고르는 '용의 태도' 4가지. 소유: 역할 3.
// 부모 화면 문구(디자인 확정): "고른 마음은 용이 내일 이야기 속에서 자연스럽게 전해요. 아이에게 직접 말하거나 행동을 시키지 않아요."
// 원칙(부모 감시 도구가 되지 않게):
//  - 부모는 아이에게 '무엇을 시킬지'가 아니라 이야기 용이 '어떤 마음으로 곁에 있을지'만 고른다.
//  - 아이에게 현실을 묻지 않는다. 장면은 언제나 판타지이고, 아이의 선택이 정답이다(잘잘못 평가 없음).
//  - 자유 입력은 기본으로 막는다(ALLOW_CUSTOM_SEED=1일 때만).
//  - 마음 담기는 한 번의 이야기에만 쓴다(회차 종료 시 비우는 건 역할 1의 complete 담당: seedConsumed).
import type { SeedPreset } from "@/types";
import { chatJSON, hasLlmKey, STORY_MODEL } from "./llm";

export type SeedOption = Exclude<SeedPreset, "custom">;

/** 부모 화면에 보여 줄 순서 (디자인 시안 2×2 순서) */
export const SEED_OPTIONS: SeedOption[] = ["courage", "praise", "company", "rest"];

/** 이야기 전체에 깔리는 용의 태도 (매 턴 프롬프트에 들어감) */
export const SEED_TONE_DIRECTIVES: Record<SeedOption, string> = {
  courage:
    "오늘은 '용기 북돋기'. 아이(또는 이야기 속 친구)가 망설이는 순간이 오면 이야기 용이 '할 수 있어용, 내가 옆에 있어용'처럼 믿어 주는 말을 한 번 해 준다(회차에 1~2번). 강요하지 않는다: 아이가 무섭다·싫다고 하면 '괜찮아용, 다른 길로 가도 돼용' 하고 다른 방법을 함께 찾는다. 해내면 크게 칭찬하기보다 함께 기뻐한다.",
  praise:
    "오늘은 '칭찬해주기'. 아이가 낸 생각이나 한 일이 이야기에 변화를 만들면, 이야기 용이 그 구체적인 행동과 결과를 짚어 고마워한다('네가 이름을 지어 줘서 나무가 반짝 웃었어용', '네 생각 덕분에 둘이 같이 앉았어용'). '잘했어', '착하다', '똑똑하다', '최고야' 같은 평가 말은 쓰지 않는다. 회차에 2~3번, 꾸밈없이.",
  company:
    "오늘은 '곁에 있어주기'. 이야기 용이 처음부터 끝까지 아이 곁에 꼭 붙어 있다. 장면이 바뀔 때 '내가 옆에 있어용', '같이 가용'처럼 함께 있다는 말을 가끔(2~3번) 하고, 아이가 혼자 남거나 누군가와 헤어지는 장면은 만들지 않는다. 마무리에서 이야기 용이 아이 곁에 나란히 누워 함께 잠든다.",
  rest:
    "오늘은 '편히 쉬어가기'. 사건과 긴장을 줄이고 느리고 포근한 장면 위주로 간다(구름 위에 누워 별 세기, 따뜻한 차, 살랑이는 바람). 질문은 쉬운 감각 질문 위주로 짧게('무슨 소리가 들려용?', '어떤 색이 좋아용?'). 고르기도 둘 다 포근한 두 갈래로만 하고, 평소보다 일찍 잠자리 쪽으로 가라앉힌다. 문장은 짧고 느리게.",
};

/** 갈림길 장면에 덧붙일 한 줄 (오늘의 별 시즌 장면 위에 얹힘) */
export const SEED_SCENE_HINTS: Record<SeedOption, string> = {
  courage: "이 장면에 아이가 해낼 수 있는 작은 도전(높은 계단 한 칸, 어두운 굴 입구에서 불 켜기 같은) 하나를 넣고, 이야기 용이 믿어 주는 말을 한 번 한다. 돌아가는 길도 늘 열어 둔다.",
  praise: "아이가 고른 쪽이 장면을 바꾸면, 다음 턴에 이야기 용이 그 선택이 만든 변화를 구체적으로 짚어 고마워한다.",
  company: "어느 쪽을 골라도 이야기 용이 아이와 함께 간다는 걸 장면에서 보여 준다('나도 같이 갈게용').",
  rest: "갈림길은 둘 다 포근한 쪽으로(예: 별 이불 덮기 / 구름 베개 베기) 고르기 쉽게 만들고, 문제는 작고 금방 풀리게 한다.",
};

/** 부모 화면 문구 (디자인 시안: 제목·설명) */
export const SEED_PRESET_PARENT_COPY: Record<SeedOption, { label: string; desc: string; emoji: string }> = {
  courage: { label: "용기 북돋기", desc: "용이 할 수 있다고 응원해줘요", emoji: "🔥" },
  praise: { label: "칭찬해주기", desc: "용이 잘한 점을 알아봐 줘요", emoji: "🌟" },
  company: { label: "곁에 있어주기", desc: "용이 끝까지 함께 있어 줘요", emoji: "🤝" },
  rest: { label: "편히 쉬어가기", desc: "조용하고 포근한 이야기로", emoji: "🌙" },
};

/** 부모 화면 안내 문구 ({name}은 아이 이름) */
export const SEED_SECTION_COPY = {
  title: "내일 이야기에 마음 담기",
  body: "고른 마음은 용이 내일 이야기 속에서 자연스럽게 전해요. {name}에게 직접 말하거나 행동을 시키지 않아요.",
  cta: "내일 이야기에 담기",
};

/** 마음 담기 선택 화면에 함께 보여 줄 약속 (부모 개입의 한계를 분명히) */
export const SEED_GUARDRAILS = [
  "아이에게 현실 이야기를 묻지 않아요. 판타지 이야기 안에서만 전해져요.",
  "아이의 선택이 정답이에요. 잘했다·못했다로 평가하지 않아요.",
  "아이에게 무엇을 하라고 시키지 않아요. 용이 곁에 있는 방식만 바뀌어요.",
  "고른 마음은 한 번의 이야기에만 담겨요.",
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

/** world의 마음 담기 설정 → 이번 회차 이야기 용의 태도 지시문 (없으면 null). */
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
  return SEED_TONE_DIRECTIVES[preset] ?? null;
}

/** 갈림길 장면용 한 줄 (custom이면 없음) */
export function seedSceneHint(preset: SeedPreset | null): string | null {
  if (!preset || preset === "custom") return null;
  return SEED_SCENE_HINTS[preset] ?? null;
}
