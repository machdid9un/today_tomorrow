// 공통 타입 계약 (README §8). 수정은 역할 1 승인 후 반영.

export type Mode = "parent" | "kid";
export type EpisodeStatus = "active" | "completed" | "interrupted";
export type EndReason = "natural" | "sleep_request" | "silence" | "timeout" | "manual";
// 내일 이야기에 마음 담기(오늘의 씨앗) = 부모가 고르는 '용의 태도' 4가지 (자유 입력 custom은 기본 비활성, 역할 3 seedPresets.ts 참고)
//   courage 용기 북돋기 · praise 칭찬해주기 · company 곁에 있어주기 · rest 편히 쉬어가기
export type SeedPreset = "courage" | "praise" | "company" | "rest" | "custom";

export interface StoryMemory {
  characters: string[];
  items: string[];
  places: string[];
  keyEvents: string[];
  nextHook: string;
}

export interface StoryTurnResult {
  narration: string;
  choices: string[];
  shouldEnd: boolean;
  endingReason: EndReason | null;
}

export interface ParentReport {
  summary: string;
  childQuotes: string[];
  childChoices: string[];
  observation: string; // 사실만, 진단 아님
  lineForParent: string; // 오늘 건네볼 한마디
  safetyFlags: string[];
  nextEpisodeTeaser: string;
}

// TODO(역할 1): World / Episode / Turn 등 DB 엔티티 타입을 supabase 스키마(§9)에 맞춰 추가.
