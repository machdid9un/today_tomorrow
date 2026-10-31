// 부모 모드: 교신 리포트 (하루씩 보기 | 이번 주) + 관찰 노트 PDF + 내일 이야기에 마음 담기. 소유: 역할 4.
// 주소: /parent  ·  /parent?view=daily&ep=<episodeId> (건네주기 화면에서 옴)  ·  ?mock=1 예시 데이터  ·  ?worldId=<id> 실제 세계 지정
import StoryParentApp from "@/components/parent/StoryParentApp";
import { getSeedCopy } from "@/components/parent/seedCopy";

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ep = typeof sp.ep === "string" && sp.ep ? sp.ep : null;
  return <StoryParentApp seedCopy={getSeedCopy()} initialTab="report" initialRange={sp.view === "daily" || ep ? "night" : "week"} initialEpisodeId={ep} />;
}
