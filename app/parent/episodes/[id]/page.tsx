// 부모 모드: 동화책 텍스트 보기. 소유: 역할 4.
import type { Metadata } from "next";
import StorybookView from "@/components/parent/StorybookView";

export const metadata: Metadata = { title: "동화책 · 상상 무전기" };

export default async function ParentStorybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StorybookView episodeId={id} />;
}
