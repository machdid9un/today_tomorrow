// 핸즈프리 음성 모험. 소유: 역할 2.
// 역할 4는 이 폴더를 건드리지 않음(README §6).
//
// VOICE_MODE는 NEXT_PUBLIC_ 접두사가 없어 브라우저에서 못 읽으므로,
// 서버 컴포넌트인 여기서 process.env.VOICE_MODE를 읽어 클라이언트 컴포넌트에 prop으로 내려줍니다.
// episodeId는 /api/sessions 생성 후 쿼리스트링으로 전달된다고 가정합니다.
// TODO(역할 1·4 확인): episodeId를 쿼리스트링 대신 다른 방식(쿠키/컨텍스트)으로 넘기기로 하면 여기만 바꾸면 됨.
import VoiceSession from "@/components/voice/VoiceSession";
import type { PlanetId, VoiceMode } from "@/components/voice/types";

function resolveVoiceMode(): VoiceMode {
  return process.env.VOICE_MODE === "ptt" ? "ptt" : "handsfree";
}

const PLANET_IDS: PlanetId[] = ["forest", "waterfire", "upside", "rainbow"];
function resolveThemeId(v: string | undefined): PlanetId | undefined {
  return PLANET_IDS.includes(v as PlanetId) ? (v as PlanetId) : undefined;
}

export default async function AdventurePage({
  searchParams,
}: {
  // themeId: 로컬 테스트용(역할 4). 안 넘기면 기존처럼 서버가 episodeId로 고정 선택한다.
  searchParams: Promise<{ episodeId?: string; themeId?: string }>;
}) {
  const { episodeId, themeId } = await searchParams;
  const mode = resolveVoiceMode();

  if (!episodeId) {
    return (
      <main className="p-6 text-sm text-ink/70">
        episodeId가 없어요. /api/sessions로 모험을 먼저 시작해주세요.
        {/* TODO(역할 1·4): 실제 플로우에서는 역할 4가 /kid에서 세션 생성 후 이 경로로 리다이렉트 */}
      </main>
    );
  }

  return (
    <main>
      <VoiceSession episodeId={episodeId} mode={mode} themeId={resolveThemeId(themeId)} />
    </main>
  );
}
