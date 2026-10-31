// POST /api/waitlist — 사전 신청 이메일 (동의 필수). 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 1): email + consent 검증 후 waitlist upsert.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
