// POST /api/auth/signup — 이메일+비밀번호로 간편 회원가입. 소유: 역할 1.
// 요청: { email, password }
// 응답: { ok: true, worldId: string|null } | { error }
//
// 가입과 동시에 하는 일(최대한 간편하게, 확인 메일 없이 바로 완료):
// ① Supabase Auth 계정 생성(email_confirm: true로 바로 확정)
// ② public.users에 같은 id로 한 줄 추가(worlds.owner_user_id 외래키가 여기를 봄)
// ③ 지금 기기에 게스트 세계(쿠키)가 있으면 그 세계를 이 계정 소유로 바꿔(claim) 그대로 이어감
//
// 설계 메모(로그인과의 차이, README §9-계정):
//   회원가입 = "지금 쌓인 걸 내 걸로 만든다" → claim해서 이어감
//   로그인   = "원래 내 계정 걸 본다"       → 지금 기기 게스트 메모리는 버림(지우지 않고 그냥 연결 안 함,
//              guest_expires_at 지나면 자동 정리됨)
import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";

const GUEST_COOKIE_NAME = "guest_token";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 해요." }, { status: 400 });
  }

  const sb = getSupabaseServerClient();

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 확인 메일 절차 없이 바로 가입 완료
  });

  if (createErr || !created?.user) {
    const already = /already|exists|registered/i.test(createErr?.message ?? "");
    console.error("[auth/signup] createUser failed", createErr);
    return NextResponse.json(
      { error: already ? "이미 가입된 이메일이에요. 로그인해 주세요." : "가입에 실패했어요. 잠시 뒤 다시 시도해 주세요." },
      { status: already ? 409 : 500 }
    );
  }
  const userId = created.user.id;

  const { error: userRowErr } = await sb.from("users").insert({ id: userId });
  if (userRowErr) {
    // users 행이 없으면 worlds.owner_user_id 외래키 때문에 claim이 실패한다. 하지만 로그인 계정
    // 자체는 이미 만들어졌으니 가입 전체를 실패로 되돌리지는 않는다(다음 로그인 때라도 고칠 수 있게 로그만 남김).
    console.error("[auth/signup] public.users insert failed", userRowErr);
  }

  // 지금 기기에 게스트 세계가 있으면 이 계정 소유로 바꿔서 이어간다.
  let worldId: string | null = null;
  const guestToken = request.cookies.get(GUEST_COOKIE_NAME)?.value;
  if (guestToken) {
    const { data: claimed, error: claimErr } = await sb
      .from("worlds")
      .update({ owner_user_id: userId })
      .eq("guest_token_hash", sha256(guestToken))
      .is("owner_user_id", null)
      .select("id")
      .maybeSingle();
    if (claimErr) console.error("[auth/signup] claim failed", claimErr);
    worldId = claimed?.id ?? null;
  }

  // 이어갈 게스트 세계가 없던 경우(바로 가입)에도 계정엔 항상 세계가 하나 있어야
  // 로그인했을 때·모험을 시작할 때 "세계가 없음" 틈이 안 생긴다.
  if (!worldId) {
    const { data: fresh, error: freshErr } = await sb
      .from("worlds")
      .insert({ owner_user_id: userId })
      .select("id")
      .single();
    if (freshErr) console.error("[auth/signup] fresh world insert failed", freshErr);
    worldId = fresh?.id ?? null;
  }

  const res = NextResponse.json({ ok: true, worldId });
  res.cookies.delete(GUEST_COOKIE_NAME); // 계정으로 넘어갔으니 더 이상 의미 없는 쿠키
  return res;
}
