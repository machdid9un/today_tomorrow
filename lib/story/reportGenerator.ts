// 관찰 노트 생성기 (스토리 엔진과 별도 호출). 소유: 역할 3.
// TODO(역할 3): 전사·선택 기록 기반 ParentReport 생성, 금지 어휘 필터링.
import type { ParentReport } from "@/types";

export interface GenerateReportInput {
  episodeId: string;
}

export async function generateParentReport(
  _input: GenerateReportInput
): Promise<ParentReport> {
  throw new Error("Not implemented");
}
