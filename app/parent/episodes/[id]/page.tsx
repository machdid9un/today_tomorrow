// 부모 모드: 회차 하나 (동화책 · 한 말 · 고른 것). 소유: 역할 4.
import type { Metadata } from "next";
import StoryParentApp from "@/components/parent/StoryParentApp";
import { getSeedCopy } from "@/components/parent/seedCopy";

export const metadata: Metadata = { title: "동화책 · 쫑긋" };

export default async function ParentStorybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryParentApp seedCopy={getSeedCopy()} initialTab="library" openEpisodeId={id} />;
}
