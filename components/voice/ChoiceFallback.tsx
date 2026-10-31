"use client";
// 선택지 버튼 폴백 (STT 실패·마이크 권한 거부·VAD 오탐 시). 소유: 역할 2.
// 정상 경로는 음성이지만, 심사위원이 마이크 없이 테스트할 수 있으므로 항상 화면에 작게 존재해야 함(README §4).

export interface ChoiceFallbackProps {
  choices: string[];
  onSelect: (choice: string) => void;
  disabled?: boolean;
}

export default function ChoiceFallback({ choices, onSelect, disabled }: ChoiceFallbackProps) {
  if (choices.length === 0) {
    return (
      <p className="text-xs text-ink/50">
        (음성이 안 되면, 다음 이야기 선택지가 여기 나타나요)
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(choice)}
          className="rounded-full border border-signal px-4 py-2 text-sm text-signal disabled:opacity-40"
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
