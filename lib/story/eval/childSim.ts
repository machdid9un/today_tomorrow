// 가상 아이: 시나리오의 "@" 자리에서 이야기꾼의 마지막 말에 아이처럼 대답한다. 소유: 역할 3. (개발 전용)
import { chatJSON, STORY_MODEL, type ChatMessage } from "../llm";

export interface ChildSimInput {
  age: number;
  persona: string;
  /** 지금까지 대화 (아이 말, 이야기꾼 말) */
  history: { childText: string; narration: string }[];
  lastNarration: string;
  lastChoices: string[];
}

const SYSTEM = (age: number, persona: string) => `너는 잠자리에서 무전기 놀이를 하는 만 ${age}세 한국 아이 역할이다.
성격·말버릇: ${persona}
무전기 이야기꾼의 마지막 말을 듣고, 이 아이가 실제로 소리 내어 할 법한 대답을 한 번 한다.
규칙:
- 아이 말투(반말). 음성 인식된 말처럼 문장부호는 거의 쓰지 않는다.
- 나이와 성격에 맞는 길이로 말한다(보통 2~15글자, 수다스러운 아이만 길게).
- 보기가 있어도 가끔은 보기에 없는 자기 생각을 말한다.
- 어른스러운 표현, 설명조, 존댓말은 쓰지 않는다.
- 이름·주소·전화번호 같은 현실 정보는 말하지 않는다.
- 졸리다, 자고 싶다는 말은 하지 않는다(대화 끝은 따로 정해져 있다).
출력: {"say": "아이가 할 말"} JSON 하나만.`;

export async function simulateChild(input: ChildSimInput): Promise<string> {
  const convo = input.history
    .slice(-6)
    .flatMap((t) => [
      t.childText ? `아이: ${t.childText}` : "",
      t.narration ? `이야기꾼: ${t.narration}` : "",
    ])
    .filter(Boolean)
    .join("\n");
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM(input.age, input.persona) },
    {
      role: "user",
      content: `[지금까지]\n${convo || "(없음)"}\n\n[이야기꾼의 마지막 말]\n${input.lastNarration}\n${
        input.lastChoices.length ? `(화면 보기: ${input.lastChoices.join(" / ")})` : ""
      }\n\n아이의 대답을 JSON으로.`,
    },
  ];
  try {
    const out = await chatJSON<{ say?: unknown }>({
      model: STORY_MODEL,
      messages,
      maxTokens: 120,
      temperature: 1.0,
      timeoutMs: 12000,
      thinking: false,
    });
    const say = typeof out.say === "string" ? out.say.replace(/["“”]/g, "").trim() : "";
    return say.slice(0, 120) || "음";
  } catch {
    return input.lastChoices[0] ?? "응";
  }
}
