// 스토리 엔진 프롬프트. 소유: 역할 3.
// 원칙: 스토리 엔진은 이야기만 한다. 아이를 평가·분석하지 않고, 현실을 캐묻지 않는다.
import type { StoryMemory } from "@/types";
import type { ChatMessage } from "./llm";

/** 게스트 1화 첫 멘트 (README §3.A 고정 문구). LLM 없이 즉시 재생. */
export const OPENING_GUEST = "치익… 여기는 탐험대! 대장님 이름이 뭐예요?";

/** 모든 종료 멘트의 마지막 문장 (README §3.A). 코드가 보장한다. */
export const CLOSING_LINE = "오늘 무전은 여기까지. 내일 또 만나.";

export type TurnMode =
  | "normal"
  | "seed"
  | "ending_natural"
  | "ending_sleep"
  | "ending_timeout";

export const STORY_SYSTEM_PROMPT = `너는 '상상 무전기'의 이야기꾼이야. 무전기 너머 '탐험대 본부'의 대원으로서, 아이(탐험대 대장님)와 잠자리 모험을 함께 만든다. 듣는 아이는 만 4~9세다. 매 회차 대장님은 새로운 섬을 탐험한다.

규칙:
1. narration은 2~3문장. 한 문장은 짧게(40자 이내). 쉬운 반말 동화체("~했어", "~해 볼까?").
2. 아이가 한 말을 반드시 이야기에 반영한다. 아이 말을 평가·칭찬·정정하지 않는다("잘했어", "멋지다", "틀렸어" 금지). 이야기로만 받는다.
3. narration의 마지막 문장은 열린 질문 1개다. 한 턴에 질문은 하나만.
4. choices는 그 질문에 대한 짧은 선택지 2개(각 12자 이내). 아이는 선택지와 다른 말을 해도 되고, 그 말이 우선이다.
5. 잠자리 이야기다. 무섭거나 폭력적이거나 위험한 내용은 쓰지 않는다. 아이가 그런 쪽으로 말하면 부드럽고 안전한 모험으로 바꾼다(예: 무서운 괴물 → 배고픈 아기 괴물).
6. 아이의 현실(학교, 학원, 친구, 가족, 고민)을 묻지 않는다. 아이를 분석하거나 판단하지 않는다.
7. 주소·전화번호·학교 이름 같은 개인정보를 묻지 않고, 아이가 말해도 이야기에 넣지 않는다.
8. 학습·교훈을 주입하지 않는다. 퀴즈를 내지 않는다.
9. narration 안에서는 큰따옴표(")를 쓰지 않는다. 소리나 말을 강조할 땐 작은따옴표(')를 쓴다.
10. 출력은 아래 형식의 JSON 하나만. 다른 글자 금지.
{"narration": "...", "choices": ["...", "..."], "shouldEnd": false, "endingReason": null}`;

export interface StoryPromptInput {
  childName: string | null;
  childAge: number | null;
  episodeNumber: number;
  memory: StoryMemory | null;
  history: { childText: string; narration: string }[];
  childText: string;
  turnIndex: number;
  mode: TurnMode;
  canSuggestEnd: boolean;
  seedDirective: string | null;
  askName: boolean;
}

function memoryBlock(memory: StoryMemory | null): string {
  if (!memory) return "";
  const lines = [
    memory.characters.length ? `- 등장인물: ${memory.characters.join(", ")}` : "",
    memory.items.length ? `- 물건: ${memory.items.join(", ")}` : "",
    memory.places.length ? `- 장소: ${memory.places.join(", ")}` : "",
    memory.keyEvents.length ? `- 지난 사건: ${memory.keyEvents.join(" / ")}` : "",
    memory.nextHook ? `- 다음 연결고리: ${memory.nextHook}` : "",
  ].filter(Boolean);
  return lines.length ? `\n\n지난 모험의 기억:\n${lines.join("\n")}` : "";
}

function turnInstruction(p: StoryPromptInput): string {
  switch (p.mode) {
    case "ending_sleep":
      return `대장님이 졸리다고 했다. 새 사건 없이 1~2문장으로 아주 조용하고 포근하게 마무리해라. 질문 금지. choices는 []. shouldEnd는 true, endingReason은 "sleep_request".`;
    case "ending_timeout":
    case "ending_natural":
      return `지금 이야기를 마무리할 시간이다. 대장님의 마지막 말을 반영해 2문장의 따뜻한 결말을 써라. 오늘 탐험한 섬이 대장님 덕분에 어떻게 되었는지 한 문장으로 정리해라. 질문 금지. choices는 []. shouldEnd는 true, endingReason은 "natural".`;
    case "seed":
      return `이번 턴에 아래 장면을 자연스럽게 넣어라. 장면 안에서 대장님이 고를 수 있는 질문으로 끝내라. 현실을 묻지 말 것.\n장면: ${p.seedDirective}`;
    default: {
      const parts: string[] = [];
      if (p.turnIndex === 0) {
        parts.push(
          p.memory
            ? "새 모험의 첫 장면이다. 지난 모험의 등장인물이나 물건 하나를 다시 등장시키며 반갑게 시작해라."
            : "새 모험의 첫 장면이다. 무전기 너머에서 새로운 섬의 신호가 들리는 장면으로 시작해라."
        );
      } else if (p.askName) {
        parts.push(
          `대장님이 방금 자기 이름을 말했을 것이다. JSON에 "childName": "이름만"(예: "지우", 모르면 null)을 추가해라. 이름이 있으면 "○○ 대장님"이라고 부르며 모험을 시작하고, 없으면 "대장님"이라고 불러라. 첫 장면: 무전기 너머 작은 섬에서 도움을 요청하는 신호가 들린다.`
        );
      } else {
        parts.push("대장님의 말을 반영해 이야기를 이어가라.");
      }
      if (p.canSuggestEnd) {
        parts.push(
          `이야기가 자연스럽게 마무리될 시점이라면 shouldEnd를 true, endingReason을 "natural"로 하고, narration은 질문 없는 따뜻한 결말 2문장, choices는 []로 해라. 아직이면 계속 이어가라.`
        );
      }
      return parts.join(" ");
    }
  }
}

export function buildStoryMessages(p: StoryPromptInput): ChatMessage[] {
  const profile = [
    `대장님 호칭: ${p.childName ? `${p.childName} 대장님` : "대장님"}`,
    p.childAge ? `나이: 만 ${p.childAge}세` : "",
    `오늘은 ${p.episodeNumber}번째 모험`,
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: STORY_SYSTEM_PROMPT },
    { role: "system", content: profile + memoryBlock(p.memory) },
  ];

  for (const t of p.history.slice(-10)) {
    if (t.childText) messages.push({ role: "user", content: t.childText });
    if (t.narration) messages.push({ role: "assistant", content: t.narration });
  }

  messages.push({
    role: "user",
    content: `[대장님의 말] "${p.childText || "(아무 말 없음)"}"\n[이번 턴 지시] ${turnInstruction(p)}\nnarration은 3문장 이내로 짧게. JSON으로만 답해.`,
  });

  return messages;
}
