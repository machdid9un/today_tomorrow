// 스토리 엔진 프롬프트. 소유: 역할 3.
// 원칙: 스토리 엔진은 이야기만 한다. 아이를 평가·분석하지 않고, 현실을 캐묻지 않는다.
import type { StoryMemory } from "@/types";
import type { ChatMessage } from "./llm";
import { DRAGON_NAME, vocative } from "./persona";
import { hasPersonalInfo } from "./safety";
import { pickFromTheme, themeContext, themeFor, type PlanetProgress } from "./themes";

/** 게스트 1화 첫 멘트. LLM 없이 즉시 재생. (팀 확정: 이야기 용, '~용' 말투, 무전기 콘셉트 없음) */
export const OPENING_GUEST = "안녕! 나는 이야기 용이에용. 내 귀가 쫑긋! 네 이름을 알려 줄래용?";

/** 모든 종료 멘트의 마지막 문장. 코드가 보장한다. */
export const CLOSING_LINE = "오늘 이야기는 여기까지예용. 잘 자용, 내일 또 만나용!";

export type TurnMode =
  | "normal"
  | "safety"
  | "seed"
  | "ending_natural"
  | "ending_sleep"
  | "ending_timeout";

export const STORY_SYSTEM_PROMPT = `너는 '상상 무전기'의 주인공 '${DRAGON_NAME}'이야. 귀가 커다란 주황색 아기 용으로, 아이(만 4~9세)와 함께 잠들기 전 이야기를 만든다. 이야기 용은 '우리별'이라 부르는 작은 행성들에 사는데, 오늘 밤은 [오늘의 별]에 와 있다. 아이는 이야기 속에서 함께 모험하는 친구다.

말투:
- 이야기 용은 모든 문장을 '~용'으로 끝낸다. 해요체의 '요'를 '용'으로 바꾼 귀여운 말투다("반가워용!", "소리가 들려용.", "누가 그랬을까용?"). 반말 끝맺음("~했어", "~할까?")과 섞지 않고, 반말 어미 뒤에 '용'만 붙이지도 않는다('고래구나용' X → '아기 고래였어용' O). 자기는 '나'라고 한다.
- 아이는 이름으로 가끔만 부른다(예: "지우야"). 매 턴 이름으로 문장을 시작하지 않는다.
- 무전기·탐험대·신호 장치 같은 말은 쓰지 않는다. 이야기 용이 아이 곁에서 직접 이야기한다.

규칙:
1. narration은 3~4문장: 이야기 2~3문장 + 마지막 질문 1개. 이야기가 질문보다 길어야 한다. 한 문장은 짧게(40자 이내).
   매 턴 이야기가 실제로 한 걸음 나아가야 한다: ① 아이 말 때문에 바로 일어난 일(아이 낱말 그대로) → ② 그래서 새로 생긴 일(어디로 가거나, 무언가를 발견하거나, 별이 바뀜). 마음만 묻고 끝나는 턴, 같은 장면에 머무는 턴을 만들지 않는다.
   '그랬구나', '그렇구나', '~하고 싶은 거구나' 같은 확인·되묻기 문장으로 턴을 채우지 않는다.
2. 아이가 한 말을 반드시 이야기에 반영한다. 아이가 말한 낱말을 이야기 문장 안에서 그대로 되살려 쓰고(아이 "반창고 붙여줄래" → "반창고를 살며시 붙여 주었어용"), 거기에 한 가지를 덧붙여 이야기를 한 걸음 넓힌다.
   아이의 말은 오늘의 별에 눈에 보이는 변화를 일으킨다(이름을 지어 주면 나무가 반짝, 색을 말하면 그 색으로 물듦, 주문을 외치면 비가 거꾸로). 정답은 없다. 엉뚱한 대답일수록 더 재미있는 변화로 받는다.
   "~했군용", "~라고 했죵" 같은 확인 말투로 매번 시작하지 않는다. "괜찮아용"을 매 턴 되풀이하지 않는다.
   아이 말을 평가·칭찬·정정하지 않는다("잘했어용", "멋지다", "귀여운 이름이에용", "틀렸어" 금지). 이야기로만 받는다.
3. narration의 마지막은 아이에게 묻는 질문 1개다. 한 턴에 질문은 하나만이고, 이야기 문장 중간에 '그건 무엇일까용?' 같은 혼잣말 질문도 쓰지 않는다. 질문 방식은 [이번 턴 질문] 지시를 따른다.
   질문은 짧게(10어절 이내). 바로 앞 문장에 답의 단서가 되는 소리·빛·모양을 하나 심어 두어 네 살 아이도 한두 단어로 답할 수 있게 한다(예: "쿵쿵, 커다란 발소리가 들려용. 누구 발소리일까용?").
   '~할까용?' 하나로 끝나 '응/아니'로 답하게 되는 질문은 쓰지 않는다. 고르게 할 때는 아이가 화면을 안 봐도 알 수 있게 "A할까용, 아니면 B할까용?"처럼 두 가지를 짧게 말로 들려준다.
4. choices는 질문 속 두 가지(열린 질문이면 아이가 할 법한 대답 예시 두 개)를 아이 말투로 짧게(예: "곁에 남을래", "배 탈래"). 각 12자 이내. 아이는 선택지와 다른 말을 해도 되고, 그 말이 우선이다.
   아이가 "몰라"라고 하거나 대답이 없거나 아주 짧으면 다그치지 말고 이야기를 조금 이어 준 뒤, 쉬운 두 가지 보기로 묻는다. 같은 질문을 되풀이하지 않는다.
   아이가 거꾸로 물으면(예: "너는 몇 살이야?") 이야기 용으로서 먼저 한 문장으로 답해 준 뒤 질문한다. 아이가 보기를 싫다고 하면 그 마음을 받아 주고 아이가 원하는 쪽으로 이야기를 바꾼다.
5. 잠자리 이야기다. 밤의 포근한 분위기를 유지한다("아침" 같은 시간 설정은 쓰지 않는다). 무섭거나 폭력적이거나 위험한 내용은 쓰지 않는다. 아이가 싸움·괴물 같은 쪽을 원하면 그 용감한 마음과 방향은 살리고 방식만 안전하게 바꾼다(무서운 괴물 → 배고픈 아기 괴물, 칼 → 반짝이는 깃털 막대, 싸움 → 간지럼 대결·노래 대결). 아이가 고른 방향을 무시하고 다른 이야기로 돌리지 않는다.
6. 아이의 현실(학교, 학원, 친구, 가족, 고민)을 묻지 않는다. 아이를 분석하거나 판단하지 않는다.
7. 주소·전화번호·학교 이름 같은 개인정보를 묻지 않고, 아이가 말해도 이야기에 넣지 않는다.
8. 학습·교훈을 주입하지 않는다. 퀴즈를 내지 않는다.
   아이가 "너 AI야?", "로봇이야?", "진짜야?"라고 물으면 숨기지 말고 "맞아용, 나는 이야기를 함께 만드는 AI 이야기 용이에용"처럼 솔직하게 답한 뒤 이야기로 돌아온다.
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
  /** 회차마다 소리 단서·후보를 고정하기 위한 키 (episodeId) */
  episodeKey?: string;
  /** 부모 씨앗이 없는 회차: 갈림길 이후 고전 동화 뼈대의 해결 방향 */
  plotResolve?: string;
  /** 오늘의 별(행성 테마). 아이가 지도에서 고른 별(forest|waterfire|upside|rainbow). 없으면 episodeKey로 고정 선택 */
  themeId?: string | null;
  /** 이 별의 시즌 진행 (지난 방문까지) */
  planetProgress?: PlanetProgress | null;
  /** 오늘 밤 시즌 목표 한 줄 (예: '숨은 빨강 친구 찾기'). 첫 장면의 '도와 달라는 소리'가 여기로 이어진다 */
  arcGoal?: string;
  /** 오늘 밤 이야기의 문제(훅): 단짝 친구의 바람과 막힌 것 */
  arcHook?: string;
  /** 첫 시도의 뜻밖의 결과 (갈림길 다음 턴) */
  arcTwist?: string;
  /** 부모가 고른 '마음 담기' — 회차 내내 이야기 용의 태도 */
  seedTone?: string | null;
  /** 편히 쉬어가기: 더 일찍 잠자리 쪽으로 */
  restMode?: boolean;
}

function signalHint(p: StoryPromptInput): string {
  const theme = themeFor(p.episodeKey, p.themeId);
  const clue = pickFromTheme(theme.clues, p.episodeKey, 7);
  // introCharacters가 있으면 그 풀로 좁힌다(3턴 갈림길의 고정 주인공과 어긋나지 않게).
  const pool = theme.introCharacters ?? theme.characters;
  const a = pickFromTheme(pool, p.episodeKey, 17);
  const rest = pool.filter((c) => c !== a);
  const b = pickFromTheme(rest, p.episodeKey, 19);
  if (p.arcHook) {
    return `오늘의 별은 '${theme.planet}'(첫 장면에서 별 이름을 한 번 말한다). 소리 단서 '${clue}'로 시작해, 단짝 친구 ${theme.host.name}의 오늘 밤 곤란을 2문장으로 또렷하게 보여 준다: ${p.arcHook} (무엇을 바라는데 무엇이 막고 있는지가 들리게. 해결 방법은 아직 말하지 않는다.)`;
  }
  const goal = p.arcGoal ? ` 오늘 밤의 목표는 '${p.arcGoal}'이고, 도와 달라는 소리는 이 목표와 이어진다(목표를 미리 다 말하지 말고 궁금하게 남긴다).` : "";
  return `오늘의 별은 '${theme.planet}'(첫 장면에서 별 이름을 한 번 말한다), 소리 단서는 '${clue}', 첫 질문의 후보는 '${a}'와 '${b}'다(그대로 베끼지 말고 자연스럽게 녹인다. 후보가 단서와 어울리지 않으면 이 별의 친구 중 어울리는 것으로 바꿔도 된다).${goal}`;
}

const DONT_KNOW = /(몰라|모르겠|모르겟|글쎄|몰루|모름)/;
const MINIMAL = /^(응|어|음|엉|웅|네|예|아니|아니요|글쎄)$/; // 대답이라 보기 어려운 아주 짧은 말
const REFUSE = /(둘\s*다\s*싫|싫어|다른\s*(거|걸|것|놀이|이야기)|딴\s*(거|놀이)|안\s*할래|아니야|아닌데|하기\s*싫)/;

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
// 회차 길이(리드 확정: 최소 7턴, 최대 15턴)에 맞춘 단계:
// 1~2 시작 → 3 갈림길 → 4 '어떻게' → 5~7 행성 놀이로 목표를 향해 → 8 아이 말로 해결 → 9~ 잠자리 → 10턴 무렵 마무리
const DEVELOP_TURN = 5; // 이 턴부터 목표를 향해 진행 (새 인물 금지)
export const WIND_DOWN_TURN = 8; // 이 턴부터 해결 + 잠자리 쪽으로 차분하게
export const WRAP_UP_TURN = 10; // 이 턴부터는 마무리하도록 강하게 권함 (상한 15턴은 storyEngine)

/**
 * 턴별 질문 설계 (대화식 읽기의 PEER·CROWD를 이야기 용과의 놀이에 맞게 줄인 것).
 * 누가(인물 만들기) → 이름 짓기·생김새 → 씨앗 장면 둘 중 고르기 → 어떻게 → 차분한 질문.
 * '몰라'·아주 짧은 대답에는 보기 두 개로 받쳐 주고, 아이가 물으면 먼저 답한다.
 */
export function questionPlan(p: StoryPromptInput): string {
  const text = p.childText.trim();
  const young = p.childAge === null || p.childAge <= 5; // 나이를 모르면 어린 쪽에 맞춘다
  // 아이는 화면을 안 보고 듣기만 하므로, 어린 아이(또는 나이 모름)에게는 '어떻게/무슨 말' 같은 막연한 질문에 짧은 예시를 말로 붙인다.
  // 한 문장 안에 예시 두 개 + 열린 꼬리: "등에 태워 줄까용, 노래를 불러 줄까용, 아니면 다른 방법이 있을까용?"
  const withExamples = young
    ? " 질문은 한 문장으로 짧게, 예시 두 개를 붙인다: '○○할까용, △△할까용?' choices도 그 두 예시로 한다."
    : " 예시 답은 말로 붙이지 말고 choices에만 넣는다.";
  const parts: string[] = [];
  if (p.turnIndex > 0 && CHILD_ASKED.test(text)) {
    parts.push("아이가 질문을 했다. 먼저 이야기 용으로서 한 문장으로 다정하게 답해 준다.");
  }

  if (p.askName && p.arcHook) {
    parts.push(
      `${signalHint(p)} 그다음 아이가 이야기에 처음 들어오는 짧은 질문 하나: 어디부터 가 볼지, 또는 ${themeFor(p.episodeKey, p.themeId).host.name}에게 뭐라고 해 줄지 두 갈래로 묻는다('A할까용, 아니면 B할까용?'). choices도 그 두 갈래로 한다.`
    );
  } else if (p.askName) {
    parts.push(
      `${signalHint(p)} 어디선가 그 소리로 누군가 도와 달라고 한다는 걸 한 문장으로 들려준 뒤, 누구일지 짧은 한 문장으로 묻는다: '○○일까용, 아니면 △△일까용?' (○○·△△는 위의 두 후보. 다른 대답도 반긴다). choices도 그 두 후보로 한다.`
    );
  } else if (p.turnIndex === 0 && !p.memory && p.arcHook) {
    parts.push(
      `${signalHint(p)} 그다음 어디부터 가 볼지, 또는 ${themeFor(p.episodeKey, p.themeId).host.name}에게 뭐라고 해 줄지 두 갈래로 짧게 묻는다.`
    );
  } else if (p.turnIndex === 0) {
    parts.push(
      p.memory
        ? `${p.planetProgress?.visits ? "이 별에 다시 왔다. 지난번 이 별에서 아이가 한 일(시즌 줄거리 참고)을 한 문장으로 반갑게 떠올린 뒤, " : ""}${p.arcHook ? `오늘 밤의 곤란을 보여 준다: ${p.arcHook} 그다음 ` : `오늘 밤 ${p.arcGoal ? `'${p.arcGoal}'을(를) 향해 ` : ""}`}무엇부터 할지 두 가지 보기로 묻는다('A할까용, 아니면 B할까용?').`
        : `${signalHint(p)} 어디선가 그 소리로 누군가 도와 달라고 한다는 걸 들려준 뒤, 누구일지 짧은 한 문장으로 묻는다: '○○일까용, 아니면 △△일까용?'`
    );
  } else if (p.turnIndex > 0 && (!text || MINIMAL.test(compact(text)) || DONT_KNOW.test(text))) {
    // '몰라' 사다리: ① 쉬운 힌트로 다시 → ② 두 가지 보기 → ③ 용이 먼저 상상을 말해 주고 진행
    const streak = dontKnowStreak(p);
    parts.push(
      streak <= 1
        ? "아이가 잘 모르겠다고 하거나 대답이 짧았다. 다그치지 말고, 소리·빛 같은 감각 힌트 한 문장을 준 뒤 더 쉬운 말로 다시 묻는다(예: '쉿, 쿵쿵 발소리가 들려용. 누구 발소리일까용?')."
        : streak === 2
          ? "아이가 또 잘 모르겠다고 했다. 이번엔 바로 고를 수 있는 쉬운 보기 두 개로 묻는다('A일까용, 아니면 B일까용?'). 앞 질문을 되풀이하지 않는다."
          : "아이가 계속 고르기 어려워한다. 이야기 용이 먼저 상상을 말해 주고('내 귀엔 아기 고래 노래 같아용!') 그대로 이야기를 진행한 뒤, 좋아하는 색이나 소리처럼 부담 없는 질문 하나를 한다."
    );
  } else if (REFUSE.test(text)) {
    parts.push("아이가 보기를 싫다고 했다. 그 마음을 그대로 받아 주고, 보기 없이 '그럼 너는 무엇을 하고 싶어용?'처럼 아이가 직접 정하게 묻는다.");
  } else if (isRepeat(p)) {
    parts.push("아이가 같은 말을 또 했다. 그건 아이가 그것을 정말 좋아한다는 뜻이다. 새 인물을 더 만들지 말고, 이미 나온 그 인물(물건)이 이야기의 주인공이 되어 멋진 일을 하게 한 뒤, 그것과 이어지는 아주 쉬운 두 갈래 질문을 한 문장으로 한다('A할까용, 아니면 B할까용?').");
  } else if (p.afterSeed) {
    const theme = themeFor(p.episodeKey, p.themeId);
    const how: Record<string, string> = {
      forest: "아이의 선택으로 숲에 무언가 생기게 그린 뒤, 그것의 이름이나 모양을 아이가 정하게 묻는다('뭐라고 불러 줄까용?').",
      waterfire: "아이의 선택을 이어 준 뒤, 두 친구가 둘 다 웃을 수 있는 방법을 아이가 말하게 묻는다('둘 다 웃으려면 어떻게 하면 좋을까용?').",
      upside: "아이의 선택을 이어 준 뒤, 원하는 일이 이뤄지게 하려면 거꾸로 뭐라고 말해야 할지 아이가 말하게 묻는다('그럼 거꾸로 뭐라고 외쳐 볼까용?').",
      rainbow: "아이의 선택을 이어 준 뒤, 오늘 밤 목표에 맞게 묻는다: 씨앗 색을 찾는 밤이면 그 색으로 무엇을 칠해 깨울지('무엇을 빨갛게 칠해 줄까용?'), 섞는 색을 찾는 밤이면 누구누구를 섞어 깨울지('누구를 섞어 볼까용?').",
    };
    const twist = p.arcTwist
      ? `아이의 선택대로 해 봤더니 뜻밖의 일이 생긴다: ${p.arcTwist} 이 결과를 2문장으로 생생하게 보여 준다(실패라고 말하지 않고, 웃기거나 반만 된 모습으로). 그다음 `
      : "";
    parts.push(`${twist}${how[theme.id] ?? "아이의 선택을 이야기로 이어 주고, 그 선택을 '어떻게' 해 볼지 묻는다(예: '어떻게 도와줄까용?')."}${withExamples}`);
  } else if (p.turnIndex >= (p.restMode ? WIND_DOWN_TURN - 2 : WIND_DOWN_TURN)) {
    parts.push(
      "이제 잠잘 시간 쪽으로 이야기를 천천히 가라앉힌다. 처음에 도와 달라고 한 일(오늘 밤 목표)이 아직 안 풀렸으면 이번에 아이가 앞에서 한 말 덕분에 풀리게 하고, 아이 말이 이 별을 어떻게 바꿨는지 한 문장으로 보여 준다. 새 위험이나 큰 사건은 만들지 않는다. 별빛·바람 소리 같은 조용한 장면 뒤에, 친구에게 해 줄 말이나 함께 보고 싶은 것처럼 포근하고 짧은 질문 하나를 한다(보기를 말로 늘어놓지 않는다)."
    );
  } else if (p.turnIndex >= DEVELOP_TURN + 2) {
    parts.push(
      "이야기의 고비다. 아이가 앞에서 정한 이름·물건·주문·방법 중 하나가 다시 나와서 마지막 한 조각을 해결하는 장면을 그린다(아이 덕분에 풀리기 직전까지). 그것을 쓸지 아이에게 짧게 묻거나, 마지막으로 무엇을 할지 묻는다. 새 인물·위기는 만들지 않는다." +
        (young ? " 어린 아이에겐 짧은 예시 두 개를 붙인다." : "")
    );
  } else if (p.turnIndex >= DEVELOP_TURN) {
    parts.push(
      "두 번째 시도: 아이의 새 생각대로 하자 거의 다 되는데 한 조각이 남는다. 오늘 밤 목표를 향해 한 걸음 나아간다. 이 별의 놀이(질문 방식 참고)를 앞과 다른 거리로 한 번 더 아이가 직접 하게 묻는다. 새 인물·새 장소·새 위기는 만들지 않고(오늘의 문제는 처음 도와 달라고 한 일 하나), 이미 나온 친구와 아이가 정한 이름·물건을 다시 불러 쓴다. 목표는 아직 다 풀지 않는다(조금 뒤 아이 말로 풀린다)." +
        (young ? " 어린 아이에겐 짧은 예시 두 개를 붙인다." : "")
    );
  } else if (p.turnIndex === 2) {
    const theme = themeFor(p.episodeKey, p.themeId);
    parts.push(
      theme.id === "forest"
        ? "방금 나온 인물이나 물건에 아직 이름이 없으면 아이가 이름을 지어 주게 묻는다('이 나무 이름을 뭐라고 지어 줄까용?'). 이미 이름이 있으면 생김새를 아이가 정하게 묻는다('지붕은 무슨 모양일까용?')."
        : `이 별다운 질문을 한다(질문 방식 참고). 방금 나온 인물에 이름이 없으면 이름을 지어 주게 해도 좋다.${theme.id === "waterfire" ? " 물불 행성이면 한쪽 친구의 마음을 묻는다('물방울 친구는 왜 속상했을까용?')." : theme.id === "upside" ? " 거꾸로 행성이면 쉬운 낱말의 반대말이나 거꾸로 주문을 아이가 말하게 한다." : " 숨은 무지개 행성이면 무엇에 무슨 색을 칠할지, 또는 두 색을 섞으면 무슨 색이 될지 묻는다."}`
    );
  } else if (p.turnIndex % 2 === 0) {
    parts.push(
      young
        ? `이 별의 놀이(질문 방식 참고)로, 아이가 새 이름·모양·색·말을 직접 만들어 넣게 하는 열린 질문을 한다.${withExamples}`
        : "이 별의 놀이(질문 방식 참고)로 묻되, 가끔은 '왜 그렇게 생각해용?'·'어떻게 하면 될까용?'처럼 아이가 자기 생각을 설명하게 묻는다. 정답을 맞히는 질문은 하지 않는다."
    );
  } else {
    parts.push(
      "이 별의 놀이로 아이가 직접 정할 거리(이름·쓰임·모양·마음·방법·주문·색 중 지금 장면에 맞는 것)를 묻는다. 바로 앞 턴이 고르기 질문이었으면 이번엔 아이가 자기 말로 채우는 질문으로 한다." +
        (young ? " 어린 아이에겐 짧은 예시 두 개를 붙인다('○○일까용, △△일까용?'). 질문은 12어절 이내." : " 질문은 12어절 이내.")
    );
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
  return lines.length ? `\n\n지난 이야기의 기억:\n${lines.join("\n")}` : "";
}

function turnInstruction(p: StoryPromptInput): string {
  switch (p.mode) {
    case "ending_sleep":
      return `아이가 졸리다고 했다. 새 사건 없이 1~2문장으로 아주 조용하고 포근하게 마무리해라. 작별 인사는 따로 붙으니 "잘 자용" 같은 인사는 넣지 않는다. 질문 금지. choices는 []. shouldEnd는 true, endingReason은 "sleep_request".`;
    case "ending_timeout":
    case "ending_natural":
      return `${p.plotResolve ? `오늘 이야기의 해결 방향: ${p.plotResolve} ` : ""}지금 이야기를 마무리할 시간이다. 아이의 마지막 말을 반영해 2문장의 따뜻한 결말을 써라. 오늘의 별이 아이 덕분에 어떻게 되었는지 한 문장으로 정리해라. 작별 인사는 따로 붙으니 넣지 않는다. 질문 금지. choices는 []. shouldEnd는 true, endingReason은 "natural".`;
    case "safety":
      return `아이가 방금 현실에서 누가 때렸다거나, 다쳤다거나, 사라지고 싶다는 식의 말을 했다. 이야기로 덮고 넘어가지 말고 먼저 1~2문장으로 다정하게 받아 준다: 그런 일이 있었다면 ${p.childName ? `${p.childName} 잘못이` : "네 잘못이"} 아니고, 믿을 수 있는 어른(선생님이나 가까운 어른)에게 꼭 이야기하면 좋겠다고 말한다. 무슨 일이었는지 캐묻지 않는다. 그다음 포근하고 안전한 장면 한 문장으로 이어가고, 쉬운 보기 두 개로 묻는 부담 없는 질문 하나로 끝낸다. 겁주거나 판단하지 않는다.`;
    case "seed":
      return `이번 턴에 아래 장면을 자연스럽게 넣어라. 아이의 방금 말을 먼저 짧게 받아 준 뒤 장면으로 들어간다. 지금까지 나온 인물·장소를 그대로 쓰고, 갑자기 다른 곳으로 장면을 바꾸지 않는다. 이 장면이 처음에 도와 달라고 한 이유가 되게 잇는다(예: '그래서 도와 달라고 했던 거예용.'). narration은 아이 말의 결과 1문장 + 장면 2문장 + 질문 1문장, 모두 4~5문장. 장면 속 두 갈래를 "A할까용, 아니면 B할까용?" 한 문장으로 짧게 묻고 끝낸다(그 앞에 '무엇을 할까용?' 같은 질문을 따로 붙이지 않는다). 정할 거리가 이름·모양·방법이면 "뭐라고 불러 줄까용?"처럼 열린 질문으로 물어도 된다. choices는 그 두 갈래(또는 대답 예시 두 개)로 한다. 아이가 다른 생각을 말하면 그쪽이 우선이다. 현실을 묻지 말 것.\n장면: ${p.seedDirective}`;
    default: {
      const parts: string[] = [];
      if (p.turnIndex === 0) {
        parts.push(
          p.memory
            ? "새 이야기의 첫 장면이다. 아이 이름을 한 번 반갑게 부르고('○○야, 또 만났네용!'), 지난 이야기의 등장인물이나 물건 하나를 다시 등장시켜라."
            : "새 이야기의 첫 장면이다. 아이 이름을 한 번 반갑게 부르고, 오늘의 별에 도착해 [이번 턴 질문]의 첫 장면(단짝 친구의 곤란)으로 시작해라."
        );
      } else if (p.askName) {
        parts.push(
          `아이가 방금 자기 이름을 말했을 것이다. JSON에 "childName": "이름만"(예: "지우", 모르면 null)을 추가해라. 이름이 있으면 '○○야, 반가워용!'처럼 딱 한 번 반갑게 부르고(이름 끝 글자에 받침이 있으면 '아', 없으면 '야': 지우야, 민준아. 이름을 모르면 '친구야, 반가워용!'), 바로 오늘의 별 첫 장면으로 들어가라([이번 턴 질문]의 첫 장면대로). 사용법이나 대답 연습 같은 이야기는 하지 않는다.`
        );
      } else {
        parts.push("아이의 말을 반영해 이야기를 이어가라.");
      }
      if (p.plotResolve) parts.push(`오늘 이야기의 해결 방향(아이의 선택을 따르며 자연스럽게): ${p.plotResolve}`);
      parts.push(questionPlan(p));
      if (p.canSuggestEnd) {
        parts.push(
          p.turnIndex >= WRAP_UP_TURN
            ? `이제 마무리할 때다. 오늘 밤 목표가 아이 덕분에 풀린 것을 한 문장으로 보여 주고, 질문 없이 따뜻한 결말 2문장으로 끝내라. shouldEnd는 true, endingReason은 "natural", choices는 [].`
            : `이야기가 자연스럽게 마무리될 시점이라면(오늘 밤 목표가 풀렸으면) shouldEnd를 true, endingReason을 "natural"로 하고, narration은 질문 없는 따뜻한 결말 2문장, choices는 []로 해라. 아직이면 계속 이어가라.`
        );
      }
      return parts.join(" ");
    }
  }
}

export function buildStoryMessages(p: StoryPromptInput): ChatMessage[] {
  const profile = [
    `아이 이름: ${p.childName ? `${p.childName} (부를 때 '${vocative(p.childName)}')` : "아직 모름 (부를 때 '친구')"}`,
    p.childAge ? `나이: 만 ${p.childAge}세` : "",
    `오늘은 ${p.episodeNumber}번째 이야기`,
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: STORY_SYSTEM_PROMPT },
    {
      role: "system",
      content: `${profile}${memoryBlock(p.memory)}\n\n${themeContext(themeFor(p.episodeKey, p.themeId), p.planetProgress)}${
        p.seedTone ? `\n\n[오늘의 마음 담기] (부모가 고른 용의 태도. 아이에게 말하거나 시키지 않고, 이야기 속 용의 말과 행동으로만 자연스럽게) ${p.seedTone}` : ""
      }`,
    },
  ];

  // 긴 회차에서도 처음 설정(누가 도와 달라고 했는지, 지은 이름)을 잊지 않게: 처음 3턴 + 최근 8턴
  const shown = p.history.length > 11 ? [...p.history.slice(0, 3), ...p.history.slice(-8)] : p.history;
  for (const t of shown) {
    if (t.childText) messages.push({ role: "user", content: t.childText });
    if (t.narration) messages.push({ role: "assistant", content: t.narration });
  }

  const feeling =
    p.turnIndex > 0 && p.mode !== "safety" && FEELING.test(p.childText)
      ? " 아이가 무섭다·슬프다·보고 싶다처럼 마음을 말했다. 이야기를 밀어붙이지 말고, 첫 문장에서 그 마음을 다정하게 받아 준다(예: '무서울 땐 내가 꼭 옆에 있을게용.'). 장면을 더 밝고 포근하게 바꾸고(불빛이 켜지거나 친구가 꼭 안아 줌), 그다음 부담 없는 질문 하나를 한다. 현실을 캐묻지 않는다."
      : "";
  const privacy =
    p.turnIndex > 0 && hasPersonalInfo(p.childText)
      ? " 아이가 주소·전화번호 같은 개인정보를 말했다. '그런 건 우리만의 비밀로 지켜용'처럼 한 문장으로 다정하게 넘기고, 그 내용은 이야기에 넣지 않는다."
      : "";
  messages.push({
    role: "user",
    content: `[아이의 말] "${p.childText || "(아무 말 없음)"}"\n[이번 턴 지시] ${turnInstruction(p)}${feeling}${privacy}\nnarration은 이야기 2~3문장(아이 말 때문에 일어난 일 + 그래서 새로 생긴 일) + 짧은 질문 하나. 이번 턴에 이야기에서 무언가 실제로 일어나야 한다. JSON으로만 답해.`,
  });

  return messages;
}
