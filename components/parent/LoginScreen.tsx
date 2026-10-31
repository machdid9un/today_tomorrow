"use client";
// 로그인 화면 (README §3.B): 이메일 매직링크 하나, 비밀번호 없음. 부모 화면과 같은 밝은 톤. 소유: 화면은 역할 4, 매직링크 처리는 역할 1.
// 로그인은 선택이에요 — 로그인 없이도 같은 기기에서 1화 → 2화 → 리포트가 모두 돌아가요. 로그인은 "다른 기기에서도, 오래 보관"용.
// Supabase 주소·키(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)가 없으면 메일을 보내지 않고 안내만 보여 줘요.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Dragon from "@/components/kid/Dragon";
import Wordmark from "@/components/kid/Wordmark";
import s from "./storyParent.module.css";
import l from "./login.module.css";
import { PRICE_LABEL, TRIAL_LABEL } from "./PayModal";

type Step = "form" | "sending" | "sent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

async function sendMagicLink(email: string, next: string): Promise<"sent" | "not_configured" | "error"> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "not_configured";
  try {
    // 설정이 있을 때만 불러온다 (빈 주소로 만들면 페이지가 깨짐)
    const { supabase } = await import("@/lib/db/supabaseClient");
    const redirect = `${window.location.origin}/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    return error ? "error" : "sent";
  } catch {
    return "error";
  }
}

export default function LoginScreen() {
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/parent";
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError("이메일 주소를 확인해 주세요.");
      return;
    }
    setError("");
    setStep("sending");
    const result = await sendMagicLink(v, next);
    if (agree) {
      // 사전 신청은 선택. 실패해도 로그인 흐름은 막지 않는다
      void fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v, consent: true }) }).catch(() => undefined);
    }
    if (result === "error") {
      setStep("form");
      setError("메일을 보내지 못했어요. 잠시 뒤에 다시 해 주세요.");
      return;
    }
    setNotice(result === "not_configured" ? "미리보기에서는 실제 메일을 보내지 않아요." : "");
    setStep("sent");
    setWait(RESEND_SECONDS);
  };

  return (
    <div className={s.page}>
      <div className={`${s.root} ${l.wrap}`}>
        <header className={s.top}>
          <Link href="/" className={s.brand}>
            <Wordmark />
          </Link>
          <Link href="/kid" className={l.skip}>
            로그인 없이 계속
          </Link>
        </header>

        <main>
          <div className={l.hero}>
            <span className={l.dragon}>
              <Dragon label="손을 흔드는 이야기 용" />
            </span>
            <h1 className={l.title}>{step === "sent" ? "메일함을 확인해 주세요" : "다른 기기에서도 이어 보기"}</h1>
            <p className={l.lead}>
              {step === "sent" ? (
                <>
                  <b>{email.trim()}</b>(으)로 로그인 링크를 보냈어요. 메일의 링크를 누르면 바로 들어와요.
                </>
              ) : (
                "이메일로 받은 링크 하나로 로그인해요. 비밀번호는 없어요."
              )}
            </p>
          </div>

          {step !== "sent" ? (
            <form className={s.card} onSubmit={submit} noValidate>
              <div className={s.field}>
                <label htmlFor="login-email">보호자 이메일</label>
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="parent@example.com"
                  value={email}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                />
              </div>
              <label className={s.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>정식 출시 소식과 사전 신청 안내를 받을게요 (선택)</span>
              </label>
              {error && (
                <p id="login-error" className={l.error} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className={s.btn} disabled={step === "sending"}>
                {step === "sending" ? "보내는 중…" : "로그인 링크 받기"}
              </button>
            </form>
          ) : (
            <section className={s.card}>
              {notice && <p className={l.notice}>{notice}</p>}
              <ol className={l.steps}>
                <li>메일함에서 「쫑긋」 메일을 찾아요. 안 보이면 스팸함도 봐 주세요.</li>
                <li>메일의 로그인 링크를 누르면 이 기기의 이야기와 함께 이어져요.</li>
              </ol>
              <button type="button" className={s.btn} onClick={() => void submit()} disabled={wait > 0}>
                {wait > 0 ? `${wait}초 뒤에 다시 보낼 수 있어요` : "메일 다시 보내기"}
              </button>
              <button
                type="button"
                className={s.btnGhost}
                onClick={() => {
                  setStep("form");
                  setNotice("");
                }}
              >
                다른 이메일로 받기
              </button>
            </section>
          )}

          <section className={s.card}>
            <h2>로그인하면 이렇게 돼요</h2>
            <ul className={l.points}>
              <li>지금 이 기기에서 만든 이야기와 별이 계정으로 옮겨져요.</li>
              <li>다른 휴대폰이나 태블릿에서도 교신 리포트와 동화책을 볼 수 있어요.</li>
              <li>로그인하지 않으면 이 기기에서만, 정해진 기간 동안 이어져요.</li>
            </ul>
            <p className={s.fine}>받는 정보는 이메일뿐이에요. 아이 이름과 나이는 원할 때만 설정에서 적고, 성별·관심사는 받지 않아요. 목소리는 저장하지 않아요.</p>
          </section>

          <div className={s.plan}>
            <span>
              <b>{PRICE_LABEL}</b> · {TRIAL_LABEL}
            </span>
            <Link href={next} className={l.link}>
              돌아가기
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
