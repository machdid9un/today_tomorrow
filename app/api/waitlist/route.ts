// POST /api/waitlist — 사전 신청 이메일 (동의 필수). 소유: 역할 1.
// body: { email: string, consent: boolean }. 같은 이메일은 덮어쓴다(upsert).
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabaseServer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; consent?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "이메일 형식을 확인해 주세요." }, { status: 400 });
  }
  if (body?.consent !== true) {
    return NextResponse.json({ error: "수신 동의가 필요합니다." }, { status: 400 });
  }
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("waitlist").upsert({ email, consent: true }, { onConflict: "email" });
  if (error) {
    console.error("[waitlist] upsert failed", error);
    return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
