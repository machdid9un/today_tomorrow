"use client";
// 건네주기 화면 (README §3.A-6, P0): 회차가 끝나면 아이 눈앞에 리포트 대신 이 화면. 소유: 역할 4.
// 역할 2 사용법 — 모험이 끝났을 때(phase === "ended") 이것만 그리면 된다:
//   <HandoffScreen episodeId={episodeId} />
// 보호자 보기 → 부모 관문 → /parent?view=daily&ep=<episodeId> (그 회차의 하루씩 보기)
import Dragon from "./Dragon";
import KidShell, { useKidToast } from "./KidShell";
import ParentGate from "./ParentGate";
import styles from "./kid.module.css";

export interface HandoffScreenProps {
  episodeId: string;
  /** 아이에게 보일 한 줄 (기본: 오늘 이야기는 여기까지) */
  message?: string;
}

export default function HandoffScreen({ episodeId, message = "오늘 이야기는 여기까지예용. 잘 자용!" }: HandoffScreenProps) {
  return (
    <KidShell showParent={false}>
      <HandoffBody episodeId={episodeId} message={message} />
    </KidShell>
  );
}

function HandoffBody({ episodeId, message }: Required<HandoffScreenProps>) {
  const toast = useKidToast();
  const href = `/parent?view=daily&ep=${encodeURIComponent(episodeId)}`;
  return (
    <section className={`${styles.view} ${styles.handoff}`} aria-labelledby="handoff-title">
      <span className={`${styles.idle} ${styles.handoffDragon}`}>
        <Dragon className={styles.dragonArt} label="손을 흔드는 이야기 용" />
      </span>
      <p className={styles.sub}>{message}</p>
      <h1 id="handoff-title" className={styles.handoffTitle}>
        엄마 아빠에게
        <br />
        건네주세요
      </h1>
      <p className={styles.handoffText}>보호자님, 아래 버튼을 2초 동안 꾹 누르면 오늘 이야기와 관찰 노트를 볼 수 있어요.</p>
      <ParentGate href={href} label="보호자 보기" large onToast={toast} />
    </section>
  );
}
