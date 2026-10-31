"use client";
// 지속 마이크 세션 + VAD + 턴 재생 루프 UI. 소유: 역할 2.
// VOICE_MODE=handsfree|ptt 분기, 종료 3조건, 선택지 버튼 폴백을 여기서 묶습니다(README §4·§6).
import { useState } from "react";
import { useVoiceAdventure } from "./useVoiceAdventure";
import ChoiceFallback from "./ChoiceFallback";
import type { PlanetId, VoiceMode } from "./types";

export interface VoiceSessionProps {
  episodeId: string;
  mode: VoiceMode;
  /** 로컬 테스트용: 미리 고른 오늘의 별. 안 넘기면 서버가 episodeId로 고정 선택(기존 동작). */
  themeId?: PlanetId;
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

function randomTag(length = 8): string {
  const letters = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

/**
 * 역할 3의 mock 메모리 저장소(lib/story/contextStore.ts)는 서버 프로세스 메모리에 쌓여서
 * 브라우저 새로고침으로 안 지워진다. 새 랜덤 태그로 완전히 새 mock 세계를 만들어 리셋한다.
 * 실제(DB) episodeId로 테스트 중이었어도, 기존 회차를 지우는 게 아니라 새 mock 회차로 전환만 한다.
 */
function freshMockEpisodeId(): string {
  return `mock-${randomTag()}-1`;
}

/**
 * episodeId를 key로 써서, 초기화 시 하위 트리를 완전히 새로 마운트한다.
 * (useVoiceAdventure 내부의 모든 state/ref/마이크 스트림/타이머가 깨끗하게 리셋됨)
 */
export default function VoiceSession({ episodeId, mode, themeId }: VoiceSessionProps) {
  const [currentEpisodeId, setCurrentEpisodeId] = useState(episodeId);

  const handleReset = () => {
    if (!window.confirm("지금까지의 대화를 초기화하고 새 모험으로 시작할까요?")) return;
    setCurrentEpisodeId(freshMockEpisodeId());
  };

  return (
    <VoiceSessionInner
      key={currentEpisodeId}
      episodeId={currentEpisodeId}
      mode={mode}
      themeId={themeId}
      onReset={handleReset}
    />
  );
}

interface VoiceSessionInnerProps extends VoiceSessionProps {
  onReset: () => void;
}

function VoiceSessionInner({ episodeId, mode, themeId, onReset }: VoiceSessionInnerProps) {
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
  } = useVoiceAdventure({ episodeId, mode, themeId });

  const isPttRecording = phase === "recording";
  const canTalkPtt = mode === "ptt" && (phase === "listening" || phase === "recording");

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-sky">
          {PHASE_LABEL[phase] ?? phase}
        </span>
        <div className="flex items-center gap-3">
          {phase !== "idle" && phase !== "ended" && (
            <button
              type="button"
              onClick={endManually}
              className="text-xs text-ink/50 underline"
            >
              오늘은 그만할래
            </button>
          )}
          {/* 개발/테스트용: mock 메모리는 새로고침으로 안 지워져서 수동 초기화가 필요함 */}
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-ink/50 underline"
          >
            대화 초기화
          </button>
        </div>
      </div>

      <p className="text-[11px] text-ink/40">
        테스트용 episodeId: {episodeId}
        {themeId ? ` · 오늘의 별: ${themeId}` : ""}
      </p>

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
