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
    "섬의 작은 탐험대 학교에 처음 들어가는 장면. 낯선 친구들이 각자 무언가를 하고 있고, 대장님이 무엇부터 해 볼지 고르게 한다. 실제 학교·학원 이야기는 꺼내지 않는다.",
  sibling:
    "작고 서툰 아기 동물이 모험에 졸졸 따라오는 장면. 찾은 보물(간식이나 반짝이는 돌)을 그 아기 동물과 나눌지, 대장님이 간직할지 고르게 한다. 실제 형제 이야기는 꺼내지 않는다.",
  fear:
    "조금 어둡고 낯선 동굴 입구 앞에 선 장면. 무서운 묘사 없이, 들어가기 전에 무엇이 있으면 용기가 날지(불빛, 친구, 노래 등) 대장님이 고르게 한다. 어떤 선택이든 안전하게 이어간다.",
  new_place:
    "처음 가 보는 섬에 막 도착한 장면. 섬 주민이 멀리서 쳐다보고 있고, 먼저 어떻게 인사할지(손 흔들기, 선물 주기 등) 대장님이 고르게 한다. 실제 이사·전학 이야기는 꺼내지 않는다.",
};

const FREE_TEXT_SYSTEM = `부모가 아이와 함께 이야기해 보고 싶은 주제를 적었다. 이것을 아이 잠자리 모험 속 '한 장면 지시문'으로 바꿔라.
규칙:
- 1~2문장. 판타지 모험 속 상징적인 장면으로만 표현한다.
- 부모 원문의 실제 사람 이름, 학교·학원 이름, 병명, 구체적 사건은 쓰지 않는다.
- 아이가 장면 안에서 무언가를 고를 수 있게 한다.
- 아이에게 현실을 묻는 장면은 만들지 않는다. 무섭거나 슬픈 장면은 만들지 않는다.
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
