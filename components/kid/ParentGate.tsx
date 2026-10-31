"use client";
// 부모 관문 (README §3.B, P0): 2초 길게 누르기 → 어른용 계산 문제 → 부모 토큰 → 부모 화면. 소유: 역할 4.
// POST /api/auth/parent-gate(역할 1)가 아직 없으면(404·501) 화면 확인만으로 넘어간다.
// 토큰이 붙으면 부모 API가 서버에서 권한을 나누므로, 화면만 바꿔서는 리포트를 볼 수 없게 된다.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./kid.module.css";

const HOLD_MS = 2000;

function newQuestion() {
  return { a: 12 + Math.floor(Math.random() * 30), b: 11 + Math.floor(Math.random() * 30) };
}

async function requestParentToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/parent-gate", { method: "POST" });
    if (res.status === 404 || res.status === 405 || res.status === 501) return true; // 아직 API 없음
    return res.ok;
  } catch {
    return false;
  }
}

export interface ParentGateProps {
  /** 통과하면 갈 곳 */
  href?: string;
  /** 버튼 글자 (기본 "부모님") */
  label?: string;
  /** 큰 버튼 모양 (건네주기 화면용) */
  large?: boolean;
  onToast?: (text: string) => void;
}

export default function ParentGate({ href = "/parent", label = "부모님", large = false, onToast }: ParentGateProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  // 문제는 창을 열 때 만든다 (처음부터 무작위로 만들면 서버·브라우저 그림이 달라짐)
  const [q, setQ] = useState({ a: 0, b: 0 });
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const raf = useRef<number | null>(null);
  const done = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      inputRef.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (!done.current) setProgress(0);
  };
  const start = () => {
    if (raf.current || open) return;
    done.current = false;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        done.current = true;
        raf.current = null;
        setProgress(0);
        setQ(newQuestion());
        setAnswer("");
        setError("");
        setOpen(true);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(answer) !== q.a + q.b) {
      setError("답이 달라요. 한 번 더 해 볼까요?");
      inputRef.current?.select();
      return;
    }
    setBusy(true);
    const ok = await requestParentToken();
    setBusy(false);
    if (!ok) {
      setError("확인하지 못했어요. 잠시 뒤에 다시 해 주세요.");
      return;
    }
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        className={large ? styles.gateLarge : styles.parentBtn}
        style={{ ["--hold" as string]: progress }}
        aria-label={`${label} 화면, 2초 동안 길게 누르세요`}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={stop}
        onClick={() => {
          if (!done.current && !raf.current) onToast?.(`${label} 버튼을 2초 동안 꾹 눌러 주세요`);
        }}
      >
        <span className={styles.holdFill} aria-hidden="true" />
        <span className={styles.gateLabel}>{progress > 0 ? "꾹 누르는 중" : label}</span>
      </button>

      <dialog ref={dialogRef} className={styles.dialog} onClose={() => setOpen(false)}>
        <h2 className={styles.dialogTitle}>부모님 확인</h2>
        <p className={styles.dialogText}>어른만 풀 수 있는 문제예요. 답을 적어 주세요.</p>
        <form onSubmit={submit}>
          <p className={styles.gateQ} aria-hidden="true">
            {q.a} + {q.b} = ?
          </p>
          <input
            ref={inputRef}
            className={styles.dialogInput}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${q.a} 더하기 ${q.b}의 답`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <p className={styles.dialogError} role="alert">
            {error}
          </p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.ghostBtn} onClick={() => setOpen(false)}>
              아이 화면으로
            </button>
            <button type="submit" className={styles.primarySmall} disabled={busy}>
              {busy ? "확인 중" : "확인"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
