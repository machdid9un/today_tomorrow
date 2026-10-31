// 오늘의 별(행성 테마): 이야기·질문 보기·음성 인식(STT) 힌트가 같은 낱말 세계를 쓰게 한다. 소유: 역할 3.
// 행성 4개는 UI/UX 시안(story-planets v4)의 이야기 지도와 같다: 구름숲 / 조개바다 / 달콤구름 / 별잠.
// 왜: 아이 대답은 짧고("고래!"), 지어낸 이름이 많아 STT가 자주 틀린다. 별마다 나올 낱말을 미리 정해 두면
//   ① 이야기 용이 그 낱말로 묻고(보기도 그 안에서) ② 아이가 그 낱말로 대답하고 ③ STT가 그 낱말을 미리 알고 듣는다.
// 별은 '기본 무대'일 뿐이다. 아이가 다른 걸 말하면(예: "우주로 갈래") 아이 말이 우선이다.

export interface StoryTheme {
  /** 시안의 planets[].type과 같은 값 (클라이언트가 고른 별을 그대로 넘기면 된다) */
  id: "forest" | "sea" | "candy" | "night";
  /** 행성 이름 (시안 그대로) */
  planet: string;
  /** 시안의 tag / short */
  tag: string;
  mood: string;
  /** 첫 장면의 소리 단서 */
  clues: string[];
  /** 도와 달라는 친구 후보 (첫 질문 보기) */
  characters: string[];
  items: string[];
  places: string[];
  /** 아이가 자주 할 법한 말 (STT 힌트용) */
  actions: string[];
  softeners?: string;
}

export const THEMES: StoryTheme[] = [
  {
    id: "forest",
    planet: "구름숲 행성",
    tag: "작은 시작, 커다란 상상",
    mood: "폭신한 나무 사이로 작은 집이 보이는, 우리만의 숲을 만드는 별",
    clues: ["사각사각 나뭇잎 소리", "부엉부엉 부엉이 소리", "우편함이 달그락거리는 소리", "반딧불이 불빛이 깜빡깜빡"],
    characters: ["다람쥐", "아기 토끼", "아기 부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 여우", "두더지", "아기 사슴", "달팽이"],
    items: ["편지", "우편함", "도토리", "버섯", "나뭇잎 우산", "꿀", "솔방울", "꽃"],
    places: ["코랄 지붕 오두막", "디딤돌 길", "폭신한 나무 아래", "버섯 마을", "옹달샘"],
    actions: ["숨을래", "따라갈래", "도와줄래", "편지 쓸래", "나무 올라갈래", "같이 갈래"],
  },
  {
    id: "sea",
    planet: "조개바다 행성",
    tag: "파도에 실려 온 이야기",
    mood: "조개껍데기 안에서 작은 목소리가 들리고, 반짝이는 바다 아래 새 친구가 사는 별",
    clues: ["철썩철썩 파도 소리", "조개껍데기 안의 작은 목소리", "보글보글 물방울 소리", "뿌우 하는 작은 고래 노래"],
    characters: ["아기 고래", "꼬마 거북이", "소라게", "아기 문어", "해파리", "아기 물개", "불가사리", "아기 인어", "갈매기", "해마"],
    items: ["조개껍데기", "진주", "부채조개", "소라 나팔", "모래성", "작은 배", "유리병 편지", "미역"],
    places: ["모래섬", "조개 집", "산호 숲", "바위 틈", "파도 위"],
    actions: ["헤엄칠래", "구해 줄래", "배 탈래", "모래성 만들래", "조개 주울래", "같이 갈래"],
  },
  {
    id: "candy",
    planet: "달콤구름 행성",
    tag: "엉뚱해도 괜찮은 곳",
    mood: "구름은 복숭아 맛, 비는 작은 별사탕. 생각한 일이 정말로 일어나는 엉뚱한 별",
    clues: ["톡톡 별사탕 비 내리는 소리", "달콤한 복숭아 냄새", "바스락바스락 사탕 포장 소리", "퐁퐁 풍선 터지는 소리"],
    characters: ["젤리 곰", "솜사탕 양", "아기 유니콘", "쿠키 요정", "마시멜로 토끼", "초코 다람쥐", "사탕 나비", "무지개 새", "꼬마 구름", "푸딩 강아지"],
    items: ["막대사탕", "별사탕", "복숭아 구름", "초콜릿 시냇물", "쿠키 집", "솜사탕", "젤리", "무지개 풍선"],
    places: ["분홍 나무 숲", "쿠키 마을", "초콜릿 시냇가", "솜사탕 구름 위", "사탕 언덕"],
    actions: ["먹어 볼래", "나눠 줄래", "구름 탈래", "풍선 불래", "같이 놀래", "만들어 볼래"],
    softeners: "단것을 많이 먹어 아픈 장면 대신 함께 나눠 먹는 장면으로, 엉뚱한 상상은 무엇이든 반긴다.",
  },
  {
    id: "night",
    planet: "별잠 행성",
    tag: "오늘의 모험도, 잘 자",
    mood: "별빛을 한 줌 모아 작은 등불을 켜고, 오늘의 이야기를 품고 천천히 쉬어 가는 고요한 별",
    clues: ["딸랑딸랑 별 방울 소리", "별빛이 반짝, 반짝, 반짝 세 번", "흥얼흥얼 자장가 소리", "가로등이 깜빡깜빡"],
    characters: ["아기 별", "달 토끼", "졸린 부엉이", "반딧불이", "구름 양", "별똥별", "꿈 요정", "아기 고양이", "꼬마 등불지기", "잠꾸러기 곰"],
    items: ["등불", "별빛", "초승달", "가로등", "별 이불", "꿈 주머니", "자장가 오르골", "달빛 사다리"],
    places: ["초승달 그네", "가로등 길", "별빛 호숫가", "구름 침대", "등불 언덕"],
    actions: ["등불 켤래", "별 모을래", "자장가 불러 줄래", "같이 누울래", "안아 줄래", "꿈꿀래"],
    softeners: "가장 고요한 별이다. 큰 사건 없이 느리고 부드럽게, 소리와 빛이 점점 줄어드는 쪽으로 이야기한다.",
  },
];

function hash(key: string, salt: number): number {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function isThemeId(v: unknown): v is StoryTheme["id"] {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}

/** 회차의 별. themeId(아이가 지도에서 고른 별)가 오면 그것을, 없으면 episodeId로 고정(같은 회차는 늘 같은 별). */
export function themeFor(episodeKey: string | undefined, themeId?: string | null): StoryTheme {
  const chosen = themeId ? THEMES.find((t) => t.id === themeId) : undefined;
  if (chosen) return chosen;
  return THEMES[hash(episodeKey ?? "", 3) % THEMES.length];
}

export function pickFromTheme<T>(list: T[], episodeKey: string | undefined, salt: number): T {
  return list[hash(episodeKey ?? "", salt) % list.length];
}

/** 이야기 프롬프트에 넣을 별 맥락 (아이 말이 우선이라는 단서 포함) */
export function themeContext(theme: StoryTheme): string {
  return [
    `[오늘의 별] ${theme.planet} — ${theme.tag}. ${theme.mood}.`,
    "이 별의 낱말(이 안에서 고르면 아이가 알아듣고 따라 말하기 쉽다):",
    `친구: ${theme.characters.join(", ")}`,
    `물건: ${theme.items.join(", ")}`,
    `장소: ${theme.places.join(", ")}`,
    theme.softeners ? `분위기: ${theme.softeners}` : "",
    "아이가 이 별 밖의 것을 말하면 아이 말이 우선이다.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** STT 힌트용 낱말 묶음 (짧게) */
export function themeSttWords(theme: StoryTheme): string[] {
  const words = [
    theme.planet,
    ...theme.characters,
    ...theme.items.slice(0, 6),
    ...theme.places.slice(0, 3),
    ...theme.actions.slice(0, 4),
  ];
  return [...new Set(words)];
}
