// 섬 테마: 회차마다 하나를 정해 이야기·질문 보기·음성 인식(STT) 힌트가 같은 낱말 세계를 쓰게 한다. 소유: 역할 3.
// 왜: 아이 대답은 짧고("고래!"), 지어낸 이름이 많아 STT가 자주 틀린다. 테마별로 나올 낱말을 미리 정해 두면
//   ① 무전기가 그 낱말로 묻고(보기도 그 안에서) ② 아이가 그 낱말로 대답하고 ③ STT가 그 낱말을 미리 알고 듣는다.
// 테마는 '기본 무대'일 뿐이다. 아이가 다른 걸 말하면(예: "우주로 갈래") 아이 말이 우선이다.
//
// ※ 초안 테마. 팀이 테마를 확정하면 이 목록만 바꾸면 된다(구조·연결 코드는 그대로).

export interface StoryTheme {
  id: string;
  /** 섬 이름 후보 (회차마다 하나) */
  islands: string[];
  /** 첫 신호의 단서 (소리·빛·냄새) */
  clues: string[];
  /** 신호를 보낼 수 있는 친구 (첫 질문 보기 후보) */
  characters: string[];
  /** 이 섬에서 나올 만한 물건 */
  items: string[];
  /** 이 섬의 장소 */
  places: string[];
  /** 아이가 자주 할 법한 행동 말 (STT 힌트용) */
  actions: string[];
  /** 무서운 쪽으로 가면 바꿀 안전한 대체 (예: 용암 → 따뜻한 온천) */
  softeners?: string;
}

export const THEMES: StoryTheme[] = [
  {
    id: "sea",
    islands: ["조개껍데기 섬", "등대 섬", "산호 섬"],
    clues: ["철썩철썩 파도 소리", "보글보글 물방울 소리", "등대 불빛이 반짝, 반짝, 반짝 세 번", "뿌우 하는 작은 고래 노래"],
    characters: ["아기 고래", "꼬마 거북이", "소라게", "아기 문어", "해파리", "아기 물개", "꼬마 펭귄", "불가사리", "아기 인어", "갈매기"],
    items: ["조개껍데기", "진주", "소라 나팔", "등대 불빛", "모래성", "작은 배", "그물", "유리병 편지"],
    places: ["모래사장", "등대", "산호 숲", "바위 틈", "파도 위"],
    actions: ["헤엄칠래", "구해 줄래", "배 탈래", "모래성 만들래", "조개 주울래", "같이 갈래"],
  },
  {
    id: "forest",
    islands: ["버섯 숲 섬", "도토리 섬", "반딧불 숲 섬"],
    clues: ["사각사각 나뭇잎 소리", "부엉부엉 부엉이 소리", "반딧불이 불빛이 깜빡깜빡", "딸랑딸랑 작은 방울 소리"],
    characters: ["다람쥐", "아기 토끼", "아기 부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 여우", "두더지", "아기 사슴", "달팽이"],
    items: ["도토리", "버섯", "나뭇잎 우산", "꿀", "솔방울", "등불", "나무 오두막", "반짝이 돌"],
    places: ["나무 구멍", "버섯 마을", "숲속 오솔길", "작은 동굴", "옹달샘"],
    actions: ["숨을래", "따라갈래", "도와줄래", "도토리 줄래", "나무 올라갈래", "같이 갈래"],
  },
  {
    id: "sky",
    islands: ["구름 섬", "별똥별 언덕", "무지개 섬"],
    clues: ["휘이 휘이 바람 소리", "별빛이 반짝, 반짝, 반짝 세 번", "딸랑딸랑 별 방울 소리", "퐁퐁 떠오르는 구름 방울"],
    characters: ["아기 별", "구름 양", "아기 용", "달 토끼", "무지개 새", "꼬마 바람", "별똥별", "아기 유니콘", "부엉이 우체부", "열기구 곰"],
    items: ["별가루", "무지개", "열기구", "구름 솜사탕", "달빛 사다리", "별 방울", "풍선", "날개"],
    places: ["구름 위", "달님 집", "무지개 다리", "별자리 길", "바람 골목"],
    actions: ["날아갈래", "구름 탈래", "별 딸래", "무지개 건널래", "같이 날래", "업어 줄래"],
  },
  {
    id: "snow",
    islands: ["얼음 사탕 섬", "눈꽃 섬", "오로라 섬"],
    clues: ["뽀드득뽀드득 눈 밟는 소리", "딸랑딸랑 썰매 방울 소리", "오로라 불빛이 살랑살랑", "쌩쌩 눈바람 소리"],
    characters: ["꼬마 펭귄", "아기 북극곰", "눈사람", "아기 물범", "눈토끼", "아기 순록", "얼음 요정", "흰 여우", "아기 고래", "눈꽃 요정"],
    items: ["썰매", "털모자", "목도리", "이글루", "눈덩이", "얼음 사탕", "따뜻한 코코아", "장갑"],
    places: ["이글루", "얼음 동굴", "눈 언덕", "얼음 호수", "오로라 아래"],
    actions: ["썰매 탈래", "눈사람 만들래", "안아 줄래", "목도리 줄래", "미끄럼 탈래", "같이 갈래"],
  },
  {
    id: "dino",
    islands: ["작은 화산 섬", "공룡 알 섬", "고사리 섬"],
    clues: ["쿵, 쿵 커다란 발소리", "따끈따끈 알이 톡톡 두드리는 소리", "부글부글 따뜻한 온천 소리", "끼룩끼룩 하늘을 나는 소리"],
    characters: ["아기 공룡", "아기 용", "티라노", "트리케라톱스", "브라키오사우루스", "익룡", "스테고사우루스", "아기 거북이", "도마뱀", "공룡 알"],
    items: ["공룡 알", "커다란 나뭇잎", "따뜻한 온천", "화석", "발자국", "열매", "둥지", "뿔"],
    places: ["화산 언덕", "고사리 숲", "온천", "공룡 둥지", "큰 바위"],
    actions: ["알 지켜 줄래", "등에 탈래", "열매 줄래", "같이 달릴래", "발자국 따라갈래", "도와줄래"],
    softeners: "화산은 무서운 폭발 대신 따끈한 온천과 반짝이는 돌, 큰 공룡은 무서운 사냥 대신 다정한 거인으로 그린다.",
  },
];

function hash(key: string, salt: number): number {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 회차의 테마. themeId가 오면 그것을, 없으면 episodeId로 고정(같은 회차는 늘 같은 테마). */
export function themeFor(episodeKey: string | undefined, themeId?: string | null): StoryTheme {
  const chosen = themeId ? THEMES.find((t) => t.id === themeId) : undefined;
  if (chosen) return chosen;
  return THEMES[hash(episodeKey ?? "", 3) % THEMES.length];
}

export function pickFromTheme<T>(list: T[], episodeKey: string | undefined, salt: number): T {
  return list[hash(episodeKey ?? "", salt) % list.length];
}

/** 이야기 프롬프트에 넣을 테마 맥락 (아이 말이 우선이라는 단서 포함) */
export function themeContext(theme: StoryTheme): string {
  return [
    `오늘의 섬 테마 낱말(이 안에서 고르면 아이가 알아듣고 따라 말하기 쉽다):`,
    `친구: ${theme.characters.join(", ")}`,
    `물건: ${theme.items.join(", ")}`,
    `장소: ${theme.places.join(", ")}`,
    theme.softeners ? `안전: ${theme.softeners}` : "",
    "대장님이 테마 밖의 것을 말하면 대장님 말이 우선이다.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** STT 힌트용 낱말 묶음 (짧게) */
export function themeSttWords(theme: StoryTheme): string[] {
  const words = [...theme.characters, ...theme.items.slice(0, 6), ...theme.places.slice(0, 3), ...theme.actions.slice(0, 4)];
  return [...new Set(words)];
}
