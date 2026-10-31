"use client";
// 지속 마이크 세션 + VAD + 턴 재생 루프 UI. 소유: 역할 2.
// VOICE_MODE=handsfree|ptt 분기, 종료 3조건, 선택지 버튼 폴백을 여기서 묶습니다(README §4·§6).
import { useVoiceAdventure } from "./useVoiceAdventure";
import ChoiceFallback from "./ChoiceFallback";
import type { VoiceMode } from "./types";

export interface VoiceSessionProps {
  episodeId: string;
  mode: VoiceMode;
}

const PHASE_LABEL: Record<string, string> = {
  idle: "시작 전",
  "requesting-permission": "마이크 확인 중…",
  listening: "말해볼까?",
  recording: "듣고 있어요…",
  transcribing: "말 받아적는 중…",
  thinking: "이야기를 생각하는 중…",
  speaking: "이야기하는 중…",
  ended: "오늘 무전은 여기까지",
  error: "잠깐 멈췄어요",
};

export default function VoiceSession({ episodeId, mode }: VoiceSessionProps) {
  const {
    phase,
    errorMessage,
    choices,
    narrationLog,
    start,
    startRecording,
    stopRecording,
    submitChoice,
    endManually,
  } = useVoiceAdventure({ episodeId, mode });

  const isPttRecording = phase === "recording";
  const canTalkPtt = mode === "ptt" && (phase === "listening" || phase === "recording");

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-sky">
          {PHASE_LABEL[phase] ?? phase}
        </span>
        {phase !== "idle" && phase !== "ended" && (
          <button
            type="button"
            onClick={endManually}
            className="text-xs text-ink/50 underline"
          >
            오늘은 그만할래
          </button>
        )}
      </div>

      {phase === "idle" && (
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-full bg-signal px-6 py-3 text-paper"
        >
          무전기 켜기
        </button>
      )}

      {mode === "ptt" && canTalkPtt && (
        <button
          type="button"
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          className="rounded-full bg-signal px-6 py-4 text-paper"
        >
          {isPttRecording ? "놓으면 끝!" : "누르고 말하기"}
        </button>
      )}

      {errorMessage && <p className="text-sm text-ink/70">{errorMessage}</p>}

      {/* 선택지 버튼 폴백: 음성 실패 시 대체 경로, 정상일 때도 항상 작게 노출 */}
      <ChoiceFallback
        choices={choices}
        onSelect={(choice) => void submitChoice(choice)}
        disabled={phase === "thinking" || phase === "speaking"}
      />

      {/* 디버그/시연용 내레이션 로그 — 필요 없으면 역할 4와 상의 후 숨김 처리 */}
      <ul className="text-xs text-ink/60">
        {narrationLog.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
