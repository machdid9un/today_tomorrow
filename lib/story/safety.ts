// 현실 위험 신호·개인정보 감지 (스토리 엔진·노트·동화책 공용). 소유: 역할 3.

/** 현실의 위험 신호(맞음·다침·스스로 해치기). 이야기 속 괴물 싸움 같은 상상과 구분하려고 "나/날/나를" 대상이 있는 표현 위주. */
const PERSON = "(?:엄마|아빠|선생님|형|누나|언니|오빠|친구|삼촌|이모|고모|할머니|할아버지|어른|아저씨|아줌마)";
const HURT = "(?:때려|때렸|때린|때리|괴롭혀|괴롭혔|괴롭히|꼬집|발로\\s*찼)";
const SAFETY_PATTERN = new RegExp(
  [
    // "아빠가 (나를|내 머리를) 때렸어" — 때린 사람 뒤에 이/가/께서가 붙은 경우
    `${PERSON}\\s*(?:이|가|께서)\\s*(?:나를?|날|내\\s*[가-힣]{0,3}[을를]?)?\\s*${HURT}`,
    // "아빠 나 때렸어" — 조사 없이 바로 '나'가 오는 경우
    `${PERSON}\\s+(?:나를?|날)\\s*${HURT}`,
    // 스스로를 해치려는 말
    "죽고\\s*싶|죽어\\s*버릴|사라지고\\s*싶|없어지고\\s*싶",
  ].join("|")
);

export function isSafetyConcern(text: string): boolean {
  return SAFETY_PATTERN.test(text.replace(/\s+/g, " "));
}

/** 전화번호·동호수 주소처럼 보이는 개인정보 */
const PHONE_RE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/;
const ADDRESS_RE = /(\d+\s*동\s*\d+\s*호|\d+\s*동이야|아파트|빌라|번지|\d{2,}\s*번지?)/;

export function hasPersonalInfo(text: string): boolean {
  return PHONE_RE.test(text) || ADDRESS_RE.test(text);
}
