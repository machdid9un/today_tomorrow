// 부모 모드: 마음 리포트 (주간 | 하루씩 보기) + 내일 이야기에 마음 담기. 소유: 역할 4.
// 마음 담기 문구는 lib/story/seedPresets.ts가 정본. 서버에서 읽어 클라이언트에 넘긴다
// (seedPresets는 llm 모듈을 가져오므로 클라이언트 컴포넌트에서 직접 import하지 않는다).
// 주소: /parent  ·  /parent?view=daily&ep=<episodeId>  ·  ?mock=1 예시 데이터 강제  ·  ?worldId=<id> 실제 세계 지정
import ParentDashboard from "@/components/parent/ParentDashboard";
import type { SeedSectionCopy } from "@/components/parent/parentData";
import { SEED_OPTIONS, SEED_PRESET_PARENT_COPY, SEED_SECTION_COPY } from "@/lib/story/seedPresets";

const SEED_COPY: SeedSectionCopy = {
  title: SEED_SECTION_COPY.title,
  body: SEED_SECTION_COPY.body,
  cta: SEED_SECTION_COPY.cta,
  options: SEED_OPTIONS.map((preset) => ({
    preset,
    label: SEED_PRESET_PARENT_COPY[preset].label,
    desc: SEED_PRESET_PARENT_COPY[preset].desc,
  })),
};

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ep = typeof sp.ep === "string" && sp.ep ? sp.ep : null;
  return <ParentDashboard seedCopy={SEED_COPY} initialView={sp.view === "daily" ? "daily" : "weekly"} initialEpisodeId={ep} />;
}
