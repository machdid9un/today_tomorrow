// 종료 후 기억 요약 + 동화책 다듬기 + 제목 생성. 소유: 역할 3.
// TODO(역할 3): worldMemory, storybookText, islandTitle/episodeTitle 생성.
import type { StoryMemory } from "@/types";

export interface SummarizeEpisodeResult {
  worldMemory: StoryMemory;
  storybookText: string;
  islandTitle: string;
  episodeTitle: string;
}

export async function summarizeEpisode(
  _episodeId: string
): Promise<SummarizeEpisodeResult> {
  throw new Error("Not implemented");
}
