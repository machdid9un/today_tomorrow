// 공통 타입 계약 (README §8). 수정은 역할 1 승인 후 반영.

export type Mode = "parent" | "kid";
export type EpisodeStatus = "active" | "completed" | "interrupted";
export type EndReason = "natural" | "sleep_request" | "silence" | "timeout" | "manual";
// 오늘의 씨앗 = 부모가 고르는 '마음 주제' (자유 입력 custom은 기본 비활성, 역할 3 seedPresets.ts 참고)
export type SeedPreset = "kindness" | "courage" | "promise" | "share" | "new_place" | "retry" | "custom";

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
