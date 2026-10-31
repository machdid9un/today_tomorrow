// POST /api/auth/parent-pin/verify — 부모 PIN 검증 (P2). 소유: 역할 1.
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO(역할 1, P2): PIN 검증 후 아이→부모 전환 허용.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
