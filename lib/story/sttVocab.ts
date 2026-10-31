// 음성 인식(STT) 낱말 사전: 아이가 '말할 법한' 낱말을 모아 전사 힌트(keyterms/prompt)로 쓴다. 소유: 역할 3.
// 행성별 낱말은 themes.ts의 sttCore/sttMore에 있고, 여기에는 행성과 상관없이 늘 나오는 말과 이름 후보를 둔다.
// 원칙: 이야기 용(내레이션)이 쓰는 말보다 '아이가 대답으로 할 말'이 우선이다.
import { THEMES, themeSttWords, type StoryTheme } from "./themes";

/** 어느 별에서나 아이가 자주 하는 대답 (실시간 한도 안에 늘 넣는 것) */
export const STT_COMMON_CORE = [
  "이야기 용",
  "몰라",
  "모르겠어",
  "응",
  "아니",
  "싫어",
  "좋아",
  "둘 다",
  "다른 거",
  "잘래",
  "졸려",
  "그만할래",
  "또 해 줘",
  "무서워",
];

/** 그 밖에 자주 나오는 말 (배치 전사·긴 목록용) */
export const STT_COMMON_MORE = [
  "용아",
  "우리별",
  "글쎄",
  "음",
  "그래",
  "아니야",
  "몰라요",
  "한 번 더",
  "다시",
  "재밌어",
  "신난다",
  "같이 갈래",
  "도와줄래",
  "안아 줄래",
  "손잡을래",
  "노래 부를래",
  "이름 지어 줄래",
  "너는 누구야",
  "너 몇 살이야",
  "너 AI야",
  "진짜야",
  "왜",
  "어디야",
  "누구야",
  "이제 자자",
  "잘 자",
  "내일 또",
  // 새 밤 줄거리(docs/stt-vocab-v2.md §1) 공통 추가: 밤 고르기·마지막 밤 가진 것 쓰기·이름·주문 짓기·되풀이 확인.
  "이거",
  "저거",
  "첫 번째",
  "두 번째",
  "아무거나",
  "다 할래",
  "제일 쉬운 거",
  "이거 쓸래",
  "다 쓸래",
  "하나 더",
  "그거 말고",
  "내가 지을래",
  "이름은",
  "뭐라고 하지",
  "이걸로 할래",
  "그냥",
  "다시 해 봐",
  "됐어",
  "안 됐어",
  "성공",
];

/**
 * 이름 후보: 이야기 용이 이름을 물은 바로 그 턴(게스트 1화 첫 대답)에만 넣는다.
 * 지금 만 4~9세(2017~2022년생)에게 흔한 이름 위주. 이름은 오인식이 가장 치명적인 낱말이라 따로 둔다.
 */
export const STT_NAME_HINTS = [
  "지우",
  "서윤",
  "하윤",
  "서연",
  "지유",
  "하은",
  "민서",
  "지안",
  "서아",
  "이서",
  "하린",
  "아린",
  "윤서",
  "수아",
  "채원",
  "도윤",
  "하준",
  "서준",
  "시우",
  "민준",
  "이준",
  "은우",
  "주원",
  "예준",
  "지호",
  "유준",
  "선우",
  "수호",
  "건우",
  "우진",
];

/** 이름을 묻는 질문인가 (방금 이야기 용의 말) */
export function isNameQuestion(narration: string): boolean {
  return /이름을\s*(알려|말해)|네\s*이름|이름이\s*뭐/.test(narration);
}

/** 전체 사전 (리드·문서용 덤프). 행성별 핵심/그 밖 + 공통 + 이름 */
export function sttVocabDump(): {
  common: { core: string[]; more: string[] };
  names: string[];
  planets: { id: string; planet: string; core: string[]; more: string[] }[];
} {
  return {
    common: { core: STT_COMMON_CORE, more: STT_COMMON_MORE },
    names: STT_NAME_HINTS,
    planets: THEMES.map((t: StoryTheme) => ({
      id: t.id,
      planet: t.planet,
      core: themeSttWords(t, true),
      more: themeSttWords(t).filter((w) => !t.sttCore.includes(w)),
    })),
  };
}
