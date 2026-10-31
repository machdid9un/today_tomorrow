"use client";
// 지속 마이크 세션 + VAD + 턴 재생 루프. 소유: 역할 2.
// TODO(역할 2): 마이크 권한 요청, VAD로 발화 종료 감지, /api/transcribe → /api/story/turn(SSE) → /api/tts 큐 재생.
// TODO(역할 2): VOICE_MODE=handsfree|ptt 분기, 종료 3조건 처리, 선택지 버튼 폴백.

export default function VoiceSession() {
  return (
    <div>
      {/* TODO: 음성 세션 UI (마이크 상태, 지직 효과음, 선택지 폴백 버튼) */}
    </div>
  );
}
