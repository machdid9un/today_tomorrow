// 오늘의 씨앗 선택 (프리셋 5개 + 자유 입력). 소유: 역할 4.
// TODO(역할 4): SeedPreset 선택 UI + 자유 입력 textarea, PATCH /api/sessions/[worldId]/seed 호출.
import type { SeedPreset } from "@/types";

export interface SeedSelectorProps {
  onSubmit: (preset: SeedPreset, freeText?: string) => void;
}

export default function SeedSelector(_props: SeedSelectorProps) {
  return (
    <section>
      {/* TODO: 씨앗 선택 UI */}
    </section>
  );
}
