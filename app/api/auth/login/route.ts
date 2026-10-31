// POST /api/auth/login — 이메일+비밀번호 로그인. 소유: 역할 1.
// 요청: { email, password }
// 응답: { ok: true, worldId: string|null } | { error }
//
// 로그인 = "원래 내 계정 걸 본다". 지금 기기에 쌓인 게스트 메모리는 계정에 연결하지 않고 그대로 둔다
// (지우진 않지만 더 이상 안 보임 — guest_expires_at 지나면 자동 정리됨). 회원가입(POST /api/auth/signup)과의
// 차이는 README §9-계정, app/api/auth/signup/route.ts 상단 메모 참고.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";

const GUEST_COOKIE_NAME = "guest_token";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  // 주의: signInWithPassword를 호출한 클라이언트는 내부 세션이 "로그인한 그 유저"로 바뀌어서,
  // 그 뒤로 이 인스턴스로 DB를 조회하면 service_role이 아니라 그 유저 권한(authenticated)으로
  // 나간다. worlds 테이블은 RLS가 켜져 있고 정책이 없어 authenticated는 완전히 막히므로,
  // 같은 인스턴스를 재사용하면 조회가 조용히 빈 값으로 돈다. 그래서 조회는 새 서비스 롤
  // 클라이언트로 따로 한다.
  const authClient = getSupabaseServerClient();
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않아요." }, { status: 401 });
  }

  const sb = getSupabaseServerClient();
  const { data: world, error: worldErr } = await sb
    .from("worlds")
    .select("id")
    .eq("owner_user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (worldErr) console.error("[auth/login] world lookup failed", worldErr);

  const res = NextResponse.json({ ok: true, worldId: world?.id ?? null });
  res.cookies.delete(GUEST_COOKIE_NAME); // 이 기기의 게스트 메모리는 계정 데이터로 교체(연결 안 하고 버려둠)
  return res;
}
