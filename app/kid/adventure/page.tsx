// 핸즈프리 음성 모험. 소유: 역할 2 (화면 겉모습은 역할 4의 AdventureStage, 음성 루프는 역할 2의 useVoiceAdventure).
//
// VOICE_MODE는 NEXT_PUBLIC_ 접두사가 없어 브라우저에서 못 읽으므로,
// 서버 컴포넌트인 여기서 process.env.VOICE_MODE를 읽어 클라이언트 컴포넌트에 prop으로 내려줍니다.
// episodeId·themeId는 첫 화면(역할 4)이 /api/sessions 생성 후 쿼리스트링으로 넘깁니다.
// 예전 화면(components/voice/VoiceSession)은 그대로 남아 있습니다. 되돌리려면 아래 AdventureStage를 VoiceSession으로 바꾸면 됩니다.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdventureStage from "@/components/kid/AdventureStage";
import type { VoiceMode } from "@/components/voice/types";
import { isThemeId } from "@/lib/story/themes";

function resolveVoiceMode(): VoiceMode {
  return process.env.VOICE_MODE === "ptt" ? "ptt" : "handsfree";
}


export const metadata: Metadata = { title: "이야기 모험 · 쫑긋" };

export default async function AdventurePage({
  searchParams,
}: {
  searchParams: Promise<{ episodeId?: string; themeId?: string }>;
}) {
  const { episodeId, themeId } = await searchParams;
  const mode = resolveVoiceMode();

  // episodeId 없이 들어오면 첫 화면에서 다시 시작
  if (!episodeId) redirect("/kid");

  return <AdventureStage episodeId={episodeId} mode={mode} themeId={isThemeId(themeId) ? themeId : null} />;
}
