"use client";
// 아이 화면 공통 틀: 밤하늘 + 별 + 머리(로고 · 로그인 · 부모님 버튼). 소유: 역할 4.
// 첫 화면, 동화책, 건네주기 화면이 같이 쓴다. 역할 2의 모험 화면도 감싸서 쓸 수 있다.
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { stopAllAudio } from "@/components/voice/audioQueue";
import ParentGate from "./ParentGate";
import Wordmark from "./Wordmark";
import styles from "./kid.module.css";
import { isLoggedIn } from "./world";

// 별 자리는 고정 공식으로 만들어서 서버·브라우저 그림이 같다
const STARS = Array.from({ length: 56 }, (_, i) => {
  const cross = i % 9 === 0;
  return {
    left: `${(i * 37.17 + 7) % 100}%`,
    top: `${(i * 23.73 + 3) % 100}%`,
    size: cross ? 12 : i % 4 === 0 ? 3 : 2,
    delay: `-${i % 13}s`,
    dur: `${4 + (i % 5)}s`,
    cross,
  };
});

const ToastContext = createContext<(text: string) => void>(() => {});
export const useKidToast = () => useContext(ToastContext);

export interface KidShellProps {
  children: React.ReactNode;
  /** 머리의 로그인 링크 (첫 화면에서만) */
  showLogin?: boolean;
  /** 머리의 부모님 버튼 (건네주기 화면처럼 본문에 큰 버튼이 있으면 끔) */
  showParent?: boolean;
  parentHref?: string;
  footer?: React.ReactNode;
}

export default function KidShell({ children, showLogin = false, showParent = true, parentHref = "/parent", footer }: KidShellProps) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  // 로그인한 기기면 "로그인" 링크를 다시 보여 주지 않는다(로그아웃 기능이 없어서 보여 줘도 할 게 없음).
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => setLoggedIn(isLoggedIn()), []);

  return (
    <ToastContext.Provider value={showToast}>
      <div className={styles.door}>
        <div className={styles.stars} aria-hidden="true">
          {STARS.map((s, i) =>
            s.cross ? (
              <i key={i} className={styles.starCross} style={{ left: s.left, top: s.top, fontSize: s.size, ["--delay" as string]: s.delay, ["--dur" as string]: s.dur }}>
                ✦
              </i>
            ) : (
              <i key={i} className={styles.star} style={{ left: s.left, top: s.top, width: s.size, height: s.size, ["--delay" as string]: s.delay, ["--dur" as string]: s.dur }} />
            ),
          )}
        </div>
        <div className={styles.app}>
          <header className={styles.bar}>
            <Link href="/kid" className={styles.brand} aria-label="쫑긋 처음으로" onClick={stopAllAudio}>
              <Wordmark /><sup aria-hidden="true">✦</sup>
            </Link>
            <div className={styles.barRight}>
              {showLogin && !loggedIn && (
                <Link href="/login" className={styles.login}>
                  로그인
                </Link>
              )}
              {showParent && <ParentGate href={parentHref} onToast={showToast} />}
            </div>
          </header>
          {children}
        </div>
        {footer}
        <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`} role="status">
          {toast}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
