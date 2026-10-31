// 취침 발화 감지 (README §4 종료 조건: "잘래", "졸려", "이제 잘 거야"). 소유: 역할 2.
// 코드가 최종 판정하므로, 스토리 엔진의 shouldEnd와 무관하게 이 목록에 걸리면 종료 절차를 시작합니다.

const SLEEP_PATTERNS = [
  "잘래",
  "졸려",
  "졸리",
  "잘거야",
  "잘 거야",
  "자고싶어",
  "자고 싶어",
  "이제 잘래",
  "그만할래",
];

export function isSleepPhrase(text: string): boolean {
  const normalized = text.replace(/\s+/g, "");
  return SLEEP_PATTERNS.some((pattern) => normalized.includes(pattern.replace(/\s+/g, "")));
}
