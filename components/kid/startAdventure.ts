// 오늘의 별을 고른 뒤 모험 시작: 마이크 권한 → 게스트 세션 → /kid/adventure. 소유: 역할 4.
// 모험 화면(역할 2)은 episodeId를 쿼리로 받는다. themeId도 같이 실어 두면 첫 /api/story/turn에 넘길 수 있다.
import type { PlanetId } from "@/lib/story/themes";
import { saveWorldId } from "./world";

async function warmUpMic() {
  // 부모가 보는 이 화면에서 마이크 권한을 먼저 받아 둔다. 거부돼도 모험 화면의 버튼 폴백으로 진행.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // 권한 거부·미지원
  }
}

function mockEpisodeId() {
  const tag = Math.random().toString(36).slice(2, 10);
  return `mock-${tag}-1`;
}

export interface StartOptions {
  themeId: PlanetId;
  short?: boolean;
  /** ?demo=1: 서버 없이 mock 회차로 바로 시작 */
  demo?: boolean;
}

/** 이동할 모험 주소를 돌려준다. 세션 API가 실패하면 역할 2의 mock 회차(mock-…-1)로 이어서 시연이 멈추지 않게 한다. */
export async function startAdventure({ themeId, short, demo }: StartOptions): Promise<string> {
  await warmUpMic();
  let episodeId: string | null = null;
  if (!demo) {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (res.ok) {
        const body = (await res.json()) as { worldId?: string; episodeId?: string };
        if (body.worldId) saveWorldId(body.worldId);
        episodeId = body.episodeId ?? null;
      } else {
        console.warn("[kid] /api/sessions", res.status, "→ mock 회차로 시작");
      }
    } catch (err) {
      console.warn("[kid] /api/sessions 실패 → mock 회차로 시작", err);
    }
  }
  const q = new URLSearchParams({ episodeId: episodeId ?? mockEpisodeId(), themeId });
  if (short) q.set("short", "1");
  return `/kid/adventure?${q.toString()}`;
}
