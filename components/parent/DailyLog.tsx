// 어제의 교신 일지 카드. 소유: 역할 4.
// TODO(역할 4): ParentReport(요약/인용/선택/관찰 한마디/건네볼 한마디/내일 예고) 표시.
import type { ParentReport } from "@/types";

export interface DailyLogProps {
  report: ParentReport;
}

export default function DailyLog(_props: DailyLogProps) {
  return (
    <section>
      {/* TODO: 교신 일지 UI */}
    </section>
  );
}
