"use client";
// 선택지 버튼 폴백 (STT 실패·마이크 권한 거부·VAD 오탐 시). 소유: 역할 2.
// 심사위원이 마이크 없이 테스트할 수 있으므로 항상 화면에 작게 존재해야 함.

export interface ChoiceFallbackProps {
  choices: string[];
  onSelect: (choice: string) => void;
}

export default function ChoiceFallback(_props: ChoiceFallbackProps) {
  return (
    <div>
      {/* TODO: 선택지 버튼 렌더링 */}
    </div>
  );
}
