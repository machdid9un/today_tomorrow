// 씨앗 프리셋 → 장면 지시문 표. 소유: 역할 3.
// 원칙: 부모가 쓴 원문은 스토리 엔진에 들어가지 않는다. 항상 '장면 지시문'으로 바꿔서 넣는다.
import type { SeedPreset } from "@/types";
import { chatJSON, hasLlmKey, STORY_MODEL } from "./llm";

export const SEED_PRESET_SCENE_DIRECTIVES: Record<
  Exclude<SeedPreset, "custom">,
  string
> = {
  friend:
    "지금까지 이야기에 나온 친구(없으면 방금 만난 새 친구) 하나가 다쳐서 천천히 걸을 수밖에 없는데, 저 멀리 출발하려는 배(또는 로켓)가 보이는 갈림길 장면. 새 인물을 갑자기 만들지 말고 이미 나온 친구를 쓴다. 그 친구 곁에 남을지, 먼저 갈지 대장님이 고르게 한다. 어느 쪽을 골라도 이야기는 따뜻하게 이어간다.",
  school:
    "지금 함께 있는 친구(없으면 방금 만난 친구)를 따라 섬의 작은 탐험대 학교에 처음 들어가는 장면. 낯선 친구들이 각자 무언가를 하고 있고(예: 조개 그림 그리기 / 바람 노래 부르기), 대장님이 무엇부터 해 볼지 고르게 한다. 실제 학교·학원 이야기는 꺼내지 않는다.",
  sibling:
    "지금 함께 있는 친구의 작고 서툰 아기 동생이 모험에 졸졸 따라오는 장면. 찾은 보물(간식이나 반짝이는 돌)을 그 아기 동생과 나눌지, 대장님이 간직할지 고르게 한다. 실제 형제 이야기는 꺼내지 않는다.",
  fear:
    "지금 함께 있는 친구와 조금 어둡고 낯선 동굴 입구 앞에 선 장면. 무서운 묘사 없이, 들어가기 전에 무엇을 챙기면 마음이 든든할지(반짝이 불빛 / 친구 손잡기 / 노래) 구체적인 두 가지로 고르게 한다. 어떤 선택이든 안전하게 이어간다.",
  new_place:
    "지금 함께 있는 친구와 처음 가 보는 옆 섬에 막 도착한 장면. 섬 주민이 멀리서 수줍게 쳐다보고 있고, 먼저 어떻게 인사할지(손 흔들기 / 작은 선물 주기) 대장님이 고르게 한다. 실제 이사·전학 이야기는 꺼내지 않는다.",
};

/** 부모 화면용 문구: 씨앗 이름 + 아이에게는 어떤 장면으로 나오는지 (현실 이야기를 아이에게 직접 묻지 않는다는 안내) */
export const SEED_PRESET_PARENT_COPY: Record<Exclude<SeedPreset, "custom">, { label: string; scene: string }> = {
  friend: { label: "친구 사이", scene: "다친 친구 곁에 남을지, 먼저 떠나는 배를 탈지 고르는 장면" },
  school: { label: "새 학기·단체생활", scene: "섬의 작은 탐험대 학교에 처음 들어가 무엇부터 해 볼지 고르는 장면" },
  sibling: { label: "동생·나누기", scene: "졸졸 따라오는 아기 동생과 찾은 보물을 나눌지 고르는 장면" },
  fear: { label: "무서움·용기", scene: "조금 어두운 동굴 앞에서 무엇을 챙기면 든든할지 고르는 장면" },
  new_place: { label: "새로운 곳", scene: "처음 가 보는 섬의 주민에게 어떻게 인사할지 고르는 장면" },
};

const SEED_PRESETS_ALL: SeedPreset[] = ["friend", "school", "sibling", "fear", "new_place", "custom"];

/** 저장 API용 입력 검증. 잘못된 값이면 null. 자유 입력은 300자까지. */
export function parseSeedInput(
  preset: unknown,
  text: unknown
): { preset: SeedPreset | null; text: string | null } | null {
  if (preset === null || preset === undefined || preset === "") return { preset: null, text: null }; // 씨앗 지우기
  if (typeof preset !== "string" || !(SEED_PRESETS_ALL as string[]).includes(preset)) return null;
  if (preset !== "custom") return { preset: preset as SeedPreset, text: null };
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
예) 부모: "동생이 생겨서 질투를 해요" → {"directive": "함께 다니던 친구에게 아주 작은 아기 동생이 생겨 모두가 아기만 바라보는 장면. 대장님이 아기에게 무엇을 해 줄지(자장가 불러 주기 / 반짝이 돌 보여 주기) 고르게 한다."}
예) 부모: "엄마 아빠가 자주 다퉈서 불안해해요" → {"directive": "섬의 두 등대지기가 불빛 색깔 때문에 투닥거려 섬이 깜빡깜빡 어지러운 장면. 대장님이 두 등대지기를 위해 무엇을 할지(두 불빛을 섞어 보기 / 함께 노래 부르기) 고르게 하고, 두 등대지기는 금세 화해해 함께 섬을 비춘다."}
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
    const directive = await convertFreeTextSeedToDirective(text ?? "");
    return directive || null;
  }
  return SEED_PRESET_SCENE_DIRECTIVES[preset] ?? null;
}
