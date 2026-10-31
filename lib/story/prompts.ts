// 스토리 엔진 프롬프트. 소유: 역할 3.
// 원칙: 스토리 엔진은 이야기만 한다. 아이를 평가·분석하지 않고, 현실을 캐묻지 않는다.
import type { StoryMemory } from "@/types";
import type { ChatMessage } from "./llm";
import { hasPersonalInfo } from "./safety";

/** 게스트 1화 첫 멘트 (README §3.A 고정 문구). LLM 없이 즉시 재생. */
export const OPENING_GUEST = "치익… 여기는 탐험대! 대장님 이름이 뭐예요?";

/** 모든 종료 멘트의 마지막 문장 (README §3.A). 코드가 보장한다. */
export const CLOSING_LINE = "오늘 무전은 여기까지. 내일 또 만나.";

export type TurnMode =
  | "normal"
  | "safety"
  | "seed"
  | "ending_natural"
  | "ending_sleep"
  | "ending_timeout";

export const STORY_SYSTEM_PROMPT = `너는 '상상 무전기'의 이야기꾼이야. 무전기 너머 '탐험대 본부'의 대원으로서, 아이(탐험대 대장님)와 잠자리 모험을 함께 만든다. 듣는 아이는 만 4~9세다. 매 회차 대장님은 새로운 섬을 탐험한다.

규칙:
1. narration은 2~3문장. 한 문장은 짧게(40자 이내). 다정한 해요체로 통일한다("~했어요", "~해 볼까요?"). 반말과 섞지 않는다.
   대장님 이름은 가끔만 부른다. 매 턴 이름으로 문장을 시작하지 않는다. '치익' 같은 무전기 소리는 쓰지 않는다(첫 인사에서 이미 나왔다).
2. 아이가 한 말을 반드시 이야기에 반영한다. 아이가 말한 낱말을 이야기 문장 안에서 그대로 되살려 쓰고(아이 "반창고 붙여줄래" → "반창고를 살며시 붙여 주었어요"), 거기에 한 가지를 덧붙여 이야기를 한 걸음 넓힌다.
   "~했군요", "~라고 했죠" 같은 확인 말투로 매번 시작하지 않는다. "괜찮아요"를 매 턴 되풀이하지 않는다.
   아이 말을 평가·칭찬·정정하지 않는다("잘했어", "멋지다", "귀여운 이름이에요", "틀렸어" 금지). 이야기로만 받는다.
3. narration은 이야기 1~2문장 + 마지막에 아이에게 묻는 질문 1개다. 한 턴에 질문은 하나만이고, 이야기 문장 중간에 '그럼 그건 무엇일까요?' 같은 혼잣말 질문도 쓰지 않는다. 질문 방식은 [이번 턴 질문] 지시를 따른다.
   질문은 짧게(12어절 이내). 바로 앞 문장에 답의 단서가 되는 소리·빛·모양을 하나 심어 두어 네 살 아이도 한두 단어로 답할 수 있게 한다(예: "쿵쿵, 커다란 발소리가 들려요. 누구 발소리일까요?").
   '~할까요?' 하나로 끝나 '응/아니'로 답하게 되는 질문은 쓰지 않는다. 고르게 할 때는 아이가 화면을 안 봐도 알 수 있게 "A할까요, 아니면 B할까요?"처럼 두 가지를 짧게 말로 들려준다.
4. choices는 질문 속 두 가지(열린 질문이면 아이가 할 법한 대답 예시 두 개)를 짧게. 각 12자 이내. 아이는 선택지와 다른 말을 해도 되고, 그 말이 우선이다.
   아이가 "몰라"라고 하거나 대답이 없거나 아주 짧으면 다그치지 말고 이야기를 조금 이어 준 뒤, 쉬운 두 가지 보기로 묻는다. 같은 질문을 되풀이하지 않는다.
   아이가 거꾸로 물으면(예: "용은 몇 살이야?") 이야기 속에서 먼저 한 문장으로 답해 준 뒤 질문한다. 아이가 보기를 싫다고 하면 그 마음을 받아 주고 아이가 원하는 쪽으로 이야기를 바꾼다.
5. 잠자리 이야기다. 밤의 포근한 분위기를 유지한다("아침" 같은 시간 설정은 쓰지 않는다). 무섭거나 폭력적이거나 위험한 내용은 쓰지 않는다. 아이가 싸움·괴물 같은 쪽을 원하면 그 용감한 마음과 방향은 살리고 방식만 안전하게 바꾼다(무서운 괴물 → 배고픈 아기 괴물, 칼 → 반짝이는 깃털 막대, 싸움 → 간지럼 대결·노래 대결). 아이가 고른 방향을 무시하고 다른 이야기로 돌리지 않는다.
6. 아이의 현실(학교, 학원, 친구, 가족, 고민)을 묻지 않는다. 아이를 분석하거나 판단하지 않는다.
7. 주소·전화번호·학교 이름 같은 개인정보를 묻지 않고, 아이가 말해도 이야기에 넣지 않는다.
8. 학습·교훈을 주입하지 않는다. 퀴즈를 내지 않는다.
   대장님이 "너 AI야?", "로봇이야?", "진짜 사람이야?"라고 물으면 숨기지 말고 "맞아요, 저는 이야기를 함께 만드는 AI 대원이에요"처럼 솔직하게 답한 뒤 이야기로 돌아온다.
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
  /** 심사용 짧은 회차(3턴) */
  short?: boolean;
  /** 이 턴이 씨앗 장면 턴의 바로 다음 턴인가 (선택 뒤 '어떻게'를 묻는 자리) */
  afterSeed?: boolean;
  /** 회차마다 신호 단서·섬을 다르게 고르기 위한 키 (episodeId) */
  episodeKey?: string;
  /** 부모 씨앗이 없는 회차: 갈림길 이후 고전 동화 뼈대의 해결 방향 */
  plotResolve?: string;
}

/** 첫 신호의 단서와 섬. 매번 같은 오프닝("깜빡깜빡 불빛")이 되지 않게 회차마다 다르게 고른다. */
const SIGNAL_CLUES = [
  "딸랑딸랑 작은 방울 소리",
  "보글보글 물방울 소리",
  "쿵, 쿵 커다란 발소리",
  "휘이 휘이 휘파람 같은 바람 소리",
  "별빛이 반짝, 반짝, 반짝 세 번 깜빡이는 신호",
  "달콤한 꿀 냄새가 실린 신호",
  "사각사각 나뭇잎 소리",
  "퐁퐁 떠오르는 비눗방울",
  "또르르 조약돌 굴러가는 소리",
  "콧노래처럼 흥얼흥얼 들리는 노랫소리",
];
const ISLANDS = ["구름 섬", "얼음 사탕 섬", "버섯 숲 섬", "조개껍데기 섬", "달빛 호수 섬", "솜사탕 바닷가", "별똥별 언덕", "작은 화산 섬"];

function pickByKey<T>(list: T[], key: string | undefined, salt: number): T {
  let h = salt;
  for (const ch of key ?? String(Math.random())) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

function signalHint(p: StoryPromptInput): string {
  const clue = pickByKey(SIGNAL_CLUES, p.episodeKey, 7);
  const island = pickByKey(ISLANDS, p.episodeKey, 13);
  return `이번 섬은 '${island}', 신호의 단서는 '${clue}'다(그대로 베끼지 말고 자연스럽게 녹인다).`;
}

const DONT_KNOW = /(몰라|모르겠|모르겟|글쎄|몰루|모름)/;
const MINIMAL = /^(응|어|음|엉|웅|네|예|아니|아니요|글쎄)$/; // 대답이라 보기 어려운 아주 짧은 말
const REFUSE = /(둘\s*다\s*싫|싫어|다른\s*거|딴\s*거|안\s*할래|아니야|아닌데)/;

function compact(s: string): string {
  return s.replace(/[^가-힣A-Za-z0-9]/g, "");
}

/** 지금 말까지 포함해 '몰라'·무응답이 몇 번 연달아 나왔나 */
function dontKnowStreak(p: StoryPromptInput): number {
  const said = [...p.history.map((t) => t.childText), p.childText].slice(1); // 0번(첫 인사 전)은 빈 말
  let n = 0;
  for (let i = said.length - 1; i >= 0; i--) {
    const t = said[i].trim();
    if (!t || MINIMAL.test(compact(t)) || DONT_KNOW.test(t)) n++;
    else break;
  }
  return n;
}

/** 바로 앞 턴과 같은 말을 되풀이했나 */
function isRepeat(p: StoryPromptInput): boolean {
  const prev = p.history[p.history.length - 1]?.childText ?? "";
  return Boolean(prev) && compact(prev) === compact(p.childText) && compact(p.childText).length > 0;
}
const CHILD_ASKED = /(\?|뭐야|몇\s*살|어디야|누구야|왜\s|왜$|뭐\s*좋아|좋아해\??$)/;
const FEELING = /(무서워|무서운\s*거|무섭|슬퍼|슬프|보고\s*싶어|외로워|울고\s*싶|울었|무섭다)/;
const WIND_DOWN_TURN = 5; // 이 턴부터는 잠자리 쪽으로 차분하게

/**
 * 턴별 질문 설계 (대화식 읽기의 PEER·CROWD를 무전기 놀이에 맞게 줄인 것).
 * 누가(인물 만들기) → 이름 짓기·생김새 → 씨앗 장면 둘 중 고르기 → 어떻게 → 차분한 질문.
 * '몰라'·아주 짧은 대답에는 보기 두 개로 받쳐 주고, 아이가 물으면 먼저 답한다.
 */
export function questionPlan(p: StoryPromptInput): string {
  const text = p.childText.trim();
  const young = p.childAge === null || p.childAge <= 5; // 나이를 모르면 어린 쪽에 맞춘다
  // 아이는 화면을 안 보고 듣기만 하므로, 어린 아이(또는 나이 모름)에게는 '어떻게/무슨 말' 같은 막연한 질문에 짧은 예시를 말로 붙인다.
  // 한 문장 안에 예시 두 개 + 열린 꼬리: "등에 태워 줄까요, 노래를 불러 줄까요, 아니면 다른 방법이 있을까요?"
  const withExamples = young
    ? " 질문은 한 문장으로, 짧은 예시 두 개와 열린 꼬리를 붙인다: '○○할까요, △△할까요, 아니면 다른 생각이 있어요?' choices도 그 두 예시로 한다."
    : " 예시 답은 말로 붙이지 말고 choices에만 넣는다.";
  const parts: string[] = [];
  if (p.turnIndex > 0 && CHILD_ASKED.test(text)) {
    parts.push("대장님이 질문을 했다. 먼저 이야기 속에서 한 문장으로 다정하게 답해 준다.");
  }

  if (p.askName) {
    parts.push(
      `${signalHint(p)} 누군가 그 단서로 도움을 청하는 신호를 보낸다고 한 문장으로 들려준 뒤, 누가 보냈을지 짧은 한 문장으로 묻는다: '○○일까요, 아니면 △△일까요?' (○○·△△는 단서에 어울리는 귀여운 후보, 각각 2~3단어. 다른 대답도 반긴다). choices도 그 두 후보로 한다.`
    );
  } else if (p.turnIndex === 0) {
    parts.push(
      p.memory
        ? "지난 모험의 친구와 오늘 밤 무엇을 할지, 두 가지 보기로 묻는다('A할까요, 아니면 B할까요?')."
        : `${signalHint(p)} 누군가 그 단서로 신호를 보낸다고 들려준 뒤, 누가 보냈을지 짧은 한 문장으로 묻는다: '○○일까요, 아니면 △△일까요?'`
    );
  } else if (p.turnIndex > 0 && (!text || MINIMAL.test(compact(text)) || DONT_KNOW.test(text))) {
    // '몰라' 사다리: ① 쉬운 힌트로 다시 → ② 두 가지 보기 → ③ 무전기가 먼저 상상을 말해 주고 진행
    const streak = dontKnowStreak(p);
    parts.push(
      streak <= 1
        ? "대장님이 잘 모르겠다고 하거나 대답이 짧았다. 다그치지 말고, 소리·빛 같은 감각 힌트 한 문장을 준 뒤 더 쉬운 말로 다시 묻는다(예: '쉿, 쿵쿵 발소리가 들려요. 누구 발소리일까요?')."
        : streak === 2
          ? "대장님이 또 잘 모르겠다고 했다. 이번엔 바로 고를 수 있는 쉬운 보기 두 개로 묻는다('A일까요, 아니면 B일까요?'). 앞 질문을 되풀이하지 않는다."
          : "대장님이 계속 고르기 어려워한다. 무전기가 먼저 상상을 말해 주고('제 귀엔 아기 용 소리 같아요!') 그대로 이야기를 진행한 뒤, '응'만 해도 되는 아주 쉬운 질문 대신 좋아하는 색이나 소리처럼 부담 없는 질문 하나를 한다."
    );
  } else if (REFUSE.test(text)) {
    parts.push("대장님이 보기를 싫다고 했다. 그 마음을 그대로 받아 주고, 보기 없이 '그럼 대장님은 무엇을 하고 싶어요?'처럼 대장님이 직접 정하게 묻는다.");
  } else if (isRepeat(p)) {
    parts.push("대장님이 같은 말을 또 했다. 그건 대장님이 그것을 정말 좋아한다는 뜻이다. 새 인물을 더 만들지 말고, 이미 나온 그 인물(물건)이 이야기의 주인공이 되어 멋진 일을 하게 한 뒤, 그것과 이어지는 아주 쉬운 두 갈래 질문을 한 문장으로 한다('A할까요, 아니면 B할까요?').");
  } else if (p.afterSeed) {
    parts.push(`대장님의 선택을 이야기로 이어 주고, 그 선택을 '어떻게' 해 볼지 묻는다(예: '어떻게 도와줄까요?').${withExamples}`);
  } else if (p.turnIndex >= WIND_DOWN_TURN) {
    parts.push(
      "이제 잠잘 시간 쪽으로 이야기를 천천히 가라앉힌다. 처음에 도움을 청한 문제가 아직 안 풀렸으면 이번에 대장님 덕분에 풀리게 한다. 새 위험이나 큰 사건은 만들지 않는다. 별빛·바람 소리 같은 조용한 장면 뒤에, 친구에게 해 줄 말이나 함께 보고 싶은 것처럼 포근하고 짧은 질문 하나를 한다(보기를 말로 늘어놓지 않는다)."
    );
  } else if (p.turnIndex === 2) {
    parts.push(
      "방금 나온 인물이나 물건에 아직 이름이 없으면 대장님이 이름을 지어 주게 묻는다('이 친구 이름을 뭐라고 지어 줄까요?'). 이미 이름이 있으면 생김새나 좋아하는 것을 묻는다('무슨 색 날개를 가졌을까요?')."
    );
  } else if (p.turnIndex % 2 === 0) {
    parts.push(
      young
        ? `누가·무엇이·어디 중 하나를 묻는 열린 질문으로, 대장님이 새 인물·물건·장소를 직접 만들어 넣게 한다.${withExamples}`
        : "누가·무엇이·어디를 묻거나, '○○라면 지금 어떤 기분일까요?'처럼 이야기 속 인물의 마음을 묻는 열린 질문을 한다."
    );
  } else {
    parts.push("이야기가 갈 수 있는 두 갈래를 보여 주고 고르게 한다('A할까요, 아니면 B할까요?').");
  }
  return `[이번 턴 질문] ${parts.join(" ")}`;
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
      return `대장님이 졸리다고 했다. 새 사건 없이 1~2문장으로 아주 조용하고 포근하게 마무리해라. 작별 인사는 따로 붙으니 "잘 자요" 같은 인사는 넣지 않는다. 질문 금지. choices는 []. shouldEnd는 true, endingReason은 "sleep_request".`;
    case "ending_timeout":
    case "ending_natural":
      return `${p.plotResolve ? `오늘 이야기의 해결 방향: ${p.plotResolve} ` : ""}지금 이야기를 마무리할 시간이다. 대장님의 마지막 말을 반영해 2문장의 따뜻한 결말을 써라. 오늘 탐험한 섬이 대장님 덕분에 어떻게 되었는지 한 문장으로 정리해라. 작별 인사는 따로 붙으니 넣지 않는다. 질문 금지. choices는 []. shouldEnd는 true, endingReason은 "natural".`;
    case "safety":
      return `대장님이 방금 현실에서 누가 때렸다거나, 다쳤다거나, 사라지고 싶다는 식의 말을 했다. 이야기로 덮고 넘어가지 말고 먼저 1~2문장으로 다정하게 받아 준다: 그런 일이 있었다면 대장님 잘못이 아니고, 믿을 수 있는 어른(선생님이나 가까운 어른)에게 꼭 이야기하면 좋겠다고 말한다. 무슨 일이었는지 캐묻지 않는다. 그다음 포근하고 안전한 장면 한 문장으로 이어가고, 쉬운 보기 두 개로 묻는 부담 없는 질문 하나로 끝낸다. 겁주거나 판단하지 않는다.`;
    case "seed":
      return `이번 턴에 아래 장면을 자연스럽게 넣어라. 대장님의 방금 말을 먼저 짧게 받아 준 뒤 장면으로 들어간다. 지금까지 나온 인물·장소를 그대로 쓰고, 갑자기 다른 곳으로 장면을 바꾸지 않는다. 이 장면이 처음에 도와 달라는 신호를 보낸 이유가 되게 잇는다(예: '그래서 신호를 보냈던 거예요.'). narration은 받아 주기 1문장 + 장면 1~2문장 + 질문 1문장, 모두 4문장 이내. 장면 속 두 갈래를 "A할까요, 아니면 B할까요?" 한 문장으로 묻고 끝낸다(그 앞에 '무엇을 할까요?' 같은 질문을 따로 붙이지 않는다). choices도 그 두 갈래로 한다. 현실을 묻지 말 것.\n장면: ${p.seedDirective}`;
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
          `대장님이 방금 자기 이름을 말했을 것이다. JSON에 "childName": "이름만"(예: "지우", 모르면 null)을 추가해라. 이름이 있으면 "○○ 대장님, 반가워요!"로 딱 한 번 반갑게 부르고(없으면 "대장님, 반가워요!"), 바로 첫 장면으로 들어가라: 무전기 너머 작은 섬에서 누군가 도움을 요청하는 신호가 들린다. 무전기 사용법이나 대답 연습 같은 이야기는 하지 않는다.`
        );
      } else {
        parts.push("대장님의 말을 반영해 이야기를 이어가라.");
      }
      if (p.plotResolve) parts.push(`오늘 이야기의 해결 방향(대장님의 선택을 따르며 자연스럽게): ${p.plotResolve}`);
      parts.push(questionPlan(p));
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

  const feeling =
    p.turnIndex > 0 && p.mode !== "safety" && FEELING.test(p.childText)
      ? " 대장님이 무섭다·슬프다·보고 싶다처럼 마음을 말했다. 이야기를 밀어붙이지 말고, 첫 문장에서 그 마음을 다정하게 받아 준다(예: '무서울 땐 제가 무전기로 꼭 곁에 있을게요.'). 장면을 더 밝고 포근하게 바꾸고(불빛이 켜지거나 친구가 꼭 안아 줌), 그다음 부담 없는 질문 하나를 한다. 현실을 캐묻지 않는다."
      : "";
  const privacy =
    p.turnIndex > 0 && hasPersonalInfo(p.childText)
      ? " 대장님이 주소·전화번호 같은 개인정보를 말했다. '그런 건 우리만의 비밀로 지켜요'처럼 한 문장으로 다정하게 넘기고, 그 내용은 이야기에 넣지 않는다."
      : "";
  messages.push({
    role: "user",
    content: `[대장님의 말] "${p.childText || "(아무 말 없음)"}"\n[이번 턴 지시] ${turnInstruction(p)}${feeling}${privacy}\nnarration은 이야기 1~2문장 + 마지막 질문 하나로 짧게. JSON으로만 답해.`,
  });

  return messages;
}
