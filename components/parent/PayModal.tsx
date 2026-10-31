"use client";
// 결제 버튼 → 팝업: 아직 사전 신청 단계라는 안내 + 가격 + 이메일로 출시 알림 받기(POST /api/waitlist).
// 아이 화면에는 절대 나오지 않는다(부모 화면 전용). 가격 문구는 PRICE_LABEL 한 곳에서 관리.
import { useEffect, useState } from "react";
import s from "./storyParent.module.css";

export const PRICE_LABEL = "월 9,900원";
export const TRIAL_LABEL = "지금은 무료 체험 (2화)";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function PayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(true);
  const [state, setState] = useState<"form" | "sending" | "done" | "error">("form");

  useEffect(() => {
    if (!open) return;
    setState("form");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const v = email.trim();
    if (!EMAIL_RE.test(v) || !agree) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, consent: true }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className={s.payOverlay} role="presentation" onClick={onClose}>
      <div className={s.payModal} role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={s.payClose} aria-label="닫기" onClick={onClose}>
          ×
        </button>
        {state === "done" ? (
          <>
            <h2 id="pay-title">신청됐어요!</h2>
            <p className={s.sub}>정식 출시하면 이메일로 가장 먼저 알려 드릴게요. 그때까지는 지금처럼 무료로 이어서 쓸 수 있어요.</p>
            <button type="button" className={s.btn} onClick={onClose}>
              닫기
            </button>
          </>
        ) : (
          <>
            <span className={s.payBadge}>아직 사전 신청 단계예요</span>
            <h2 id="pay-title">
              정식 출시 때 <b>{PRICE_LABEL}</b>
            </h2>
            <p className={s.sub}>
              {TRIAL_LABEL}. 지금은 결제 없이 무료로 이어서 쓸 수 있어요. 이메일을 남겨 주시면 출시 소식과 첫 달 혜택을 보내 드릴게요.
            </p>
            <ul className={s.payList}>
              <li>아이 2명까지, 네 행성 전부</li>
              <li>매일 밤 이어지는 시즌 이야기</li>
              <li>그림책 PDF · 주간 마음 리포트</li>
            </ul>
            <div className={s.field}>
              <label htmlFor="pay-email">이메일</label>
              <input
                id="pay-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <label className={s.check}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>출시 소식과 사전 신청 안내를 이메일로 받을게요</span>
            </label>
            {state === "error" && <p className={s.fine}>이메일을 확인하고 동의에 체크해 주세요. 잠시 뒤 다시 시도해도 돼요.</p>}
            <button type="button" className={s.btn} onClick={submit} disabled={state === "sending"}>
              {state === "sending" ? "보내는 중…" : "이메일로 출시 알림 받기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
