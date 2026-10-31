"use client";
// 모험 중 이야기 용 상태 (아이는 글을 못 읽을 수 있어서 용의 움직임 + 짧은 말로 알림). 소유: 역할 4.
// 역할 2 사용법 — VoiceSession에서 phase만 넘기면 된다:
//   <DragonStatus phase={phase} />
// 말하는 중엔 통통, 생각 중엔 갸우뚱, 듣는 중엔 귀 기울이듯 커졌다 작아진다. 움직임 줄이기 설정이면 멈춘다.
import type { SessionPhase } from "@/components/voice/types";
import Dragon from "./Dragon";
import styles from "./kid.module.css";

const LABEL: Record<SessionPhase, string> = {
  idle: "시작해 볼까용?",
  "requesting-permission": "마이크를 켜는 중이에용",
  listening: "말해 줘용, 듣고 있어용",
  recording: "귀 쫑긋! 듣는 중이에용",
  transcribing: "잘 들었어용",
  thinking: "음… 생각하는 중이에용",
  speaking: "이야기하는 중이에용",
  ended: "오늘 이야기는 여기까지예용",
  error: "잠깐 멈췄어용. 버튼으로 골라 줄래용?",
};

export default function DragonStatus({ phase, label }: { phase: SessionPhase; label?: string }) {
  return (
    <div className={styles.status}>
      <span className={`${styles.statusDragon}`} data-phase={phase}>
        <span className={styles.idle}>
          <Dragon className={styles.dragonArt} label="이야기 용" />
        </span>
      </span>
      <span className={styles.statusPill} data-phase={phase} role="status" aria-live="polite">
        <span className={styles.statusDot} aria-hidden="true" />
        {label ?? LABEL[phase]}
      </span>
    </div>
  );
}
