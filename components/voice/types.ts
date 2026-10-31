// 음성 루프 내부 타입. 소유: 역할 2.
import type { EndReason } from "@/types";

export type VoiceMode = "handsfree" | "ptt";

export type SessionPhase =
  | "idle" // 시작 전
  | "requesting-permission" // 마이크 권한 요청 중
  | "listening" // 아이 발화 대기 (handsfree: VAD 감시 중 / ptt: 버튼 대기)
  | "recording" // 발화 녹음 중
  | "transcribing" // STT 처리 중
  | "thinking" // 스토리 엔진 응답 대기 중 (SSE 수신)
  | "speaking" // TTS 재생 중
  | "ended" // 회차 종료
  | "error"; // 복구 가능한 오류 (마이크 권한 거부, STT 실패 등) → 버튼 폴백 유도

export interface TurnSentence {
  index: number;
  text: string;
}

export interface TurnCompletePayload {
  choices: string[];
  shouldEnd: boolean;
  endingReason: EndReason | null;
}

export interface VoiceSessionConfig {
  episodeId: string;
  mode: VoiceMode;
  /** 자연 종료(5분 이후 shouldEnd 수용)를 허용하기 시작하는 시각(ms) */
  naturalEndAfterMs: number;
  /** 하드 타임아웃(10분) */
  hardTimeoutMs: number;
  /** 재생 종료 후 무응답 침묵 타이머(60초) */
  silenceTimeoutMs: number;
}

export const DEFAULT_VOICE_SESSION_CONFIG: Omit<VoiceSessionConfig, "episodeId" | "mode"> = {
  naturalEndAfterMs: 5 * 60 * 1000,
  hardTimeoutMs: 10 * 60 * 1000,
  silenceTimeoutMs: 60 * 1000,
};

export interface EndEpisodePayload {
  endReason: EndReason;
  latencyMs?: number;
}

// NOTE(역할 1·3 확인 필요): /api/episodes/[id]/complete 요청 바디 형태가 이 모양이 맞는지,
// /api/story/turn 요청에 latencyMs를 같이 보내도 되는지 API 계약 합의 때 확인해주세요.
