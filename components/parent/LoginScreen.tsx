"use client";
// 로그인/회원가입 화면 (README §9-계정): 이메일+비밀번호, 확인 메일 없이 바로 가입. 소유: 화면은 역할 4, API는 역할 1.
// 로그인은 선택이에요 — 로그인 없이도 같은 기기에서 1화 → 2화 → 리포트가 모두 돌아가요. 로그인은 "다른 기기에서도, 오래 보관"용.
//
// 회원가입 = 지금 기기에 쌓인 이야기를 그대로 내 계정으로(POST /api/auth/signup이 게스트 세계를 claim).
// 로그인   = 원래 내 계정 걸 본다(지금 기기에 쌓인 건 계정에 안 연결되고 그대로 버려짐).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Dragon from "@/components/kid/Dragon";
import Wordmark from "@/components/kid/Wordmark";
import { markLoggedIn, saveWorldId } from "@/components/kid/world";
import s from "./storyParent.module.css";
import l from "./login.module.css";
import { PRICE_LABEL, TRIAL_LABEL } from "./PayModal";

type Mode = "signup" | "login";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function callAuth(mode: Mode, email: string, password: string): Promise<{ ok: true; worldId: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = (await res.json().catch(() => ({}))) as { worldId?: string | null; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? "잠시 뒤에 다시 시도해 주세요." };
    return { ok: true, worldId: body.worldId ?? null };
  } catch {
    return { ok: false, error: "네트워크 문제로 처리하지 못했어요." };
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/parent";
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError("이메일 주소를 확인해 주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    setError("");
    setBusy(true);

    const result = await callAuth(mode, v, password);
    if (agree) {
      // 사전 신청은 선택. 실패해도 로그인 흐름은 막지 않는다
      void fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v, consent: true }) }).catch(() => undefined);
    }
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    markLoggedIn();
    if (result.worldId) {
      saveWorldId(result.worldId);
      // ParentDataProvider는 kid/world.ts와 다른(별도) localStorage 키를 쓰고, 그건 ?worldId= 쿼리로
      // 받을 때만 채워진다(HandoffScreen과 같은 방식) — 안 붙이면 로그인 후에도 부모 화면이
      // "쌓인 데이터 없음"으로 보인다.
      const sep = next.includes("?") ? "&" : "?";
      router.push(`${next}${sep}worldId=${encodeURIComponent(result.worldId)}`);
      return;
    }
    router.push(next);
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
            <h1 className={l.title}>{mode === "signup" ? "이야기를 계속 간직해요" : "다른 기기에서도 이어 보기"}</h1>
            <p className={l.lead}>
              {mode === "signup"
                ? "지금 이 기기에서 만든 이야기를 계정으로 옮겨 둘게요. 비밀번호 하나만 정하면 끝이에요."
                : "이메일과 비밀번호로 로그인하면 원래 계정의 이야기를 볼 수 있어요."}
            </p>
          </div>

          <form className={s.card} onSubmit={submit} noValidate>
            <div role="tablist" aria-label="회원가입 또는 로그인" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["signup", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={mode === m ? s.btn : s.btnGhost}
                  style={{ flex: 1 }}
                >
                  {m === "signup" ? "회원가입" : "로그인"}
                </button>
              ))}
            </div>

            <div className={s.field}>
              <label htmlFor="auth-email">보호자 이메일</label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="auth-password">비밀번호</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="6자 이상"
                value={password}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "auth-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            {mode === "signup" && (
              <label className={s.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>정식 출시 소식과 사전 신청 안내를 받을게요 (선택)</span>
              </label>
            )}
            {error && (
              <p id="auth-error" className={l.error} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={s.btn} disabled={busy}>
              {busy ? "처리하는 중…" : mode === "signup" ? "회원가입하고 이어가기" : "로그인"}
            </button>
          </form>

          <section className={s.card}>
            <h2>{mode === "signup" ? "회원가입하면 이렇게 돼요" : "로그인하면 이렇게 돼요"}</h2>
            <ul className={l.points}>
              {mode === "signup" ? (
                <>
                  <li>지금 이 기기에서 만든 이야기와 별이 이 계정으로 옮겨져요.</li>
                  <li>다음부터는 어느 기기에서든 이 계정으로 로그인하면 이어 볼 수 있어요.</li>
                </>
              ) : (
                <>
                  <li>이 계정에 저장된 이야기와 리포트를 불러와요.</li>
                  <li>지금 이 기기에서 로그인 전에 만든 이야기는 계정에 합쳐지지 않아요.</li>
                </>
              )}
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
