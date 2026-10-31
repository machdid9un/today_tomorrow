// POST /api/auth/parent-pin/setup — 부모 PIN 설정 (P2). 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 1, P2): PIN 해시 저장.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
