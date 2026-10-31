// PATCH /api/sessions/[worldId]/seed — 부모 씨앗 저장. 소유: 역할 1.
import { NextResponse } from "next/server";

export async function PATCH(
  _request: Request,
  _context: { params: Promise<{ worldId: string }> }
) {
  // TODO(역할 1): next_seed_preset / next_seed_text 업데이트, 소유권 검증.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
