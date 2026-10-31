// 스토리 엔진 프롬프트 + 턴 생성. 소유: 역할 3.
// TODO(역할 3): LLM 호출, StoryTurnResult 검증, SSE 문장 분할 구현.
import type { StoryMemory, StoryTurnResult } from "@/types";

export interface GenerateTurnInput {
  episodeId: string;
  childText: string;
  memory: StoryMemory;
  elapsedSeconds: number;
}

export async function generateTurn(
  _input: GenerateTurnInput
): Promise<StoryTurnResult> {
  throw new Error("Not implemented");
}
