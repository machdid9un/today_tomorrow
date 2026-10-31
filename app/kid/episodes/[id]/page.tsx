// 동화책 열람 (아이 모드, 듣기 중심). 소유: 역할 4.
// GET /api/episodes/[id] (아이 모드 응답)로 동화책 텍스트를 보여 준다. sample-N 은 샘플 장소의 동화책.
import StoryBook from "@/components/kid/StoryBook";

export default async function EpisodeBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryBook id={id} />;
}
