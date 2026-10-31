// 부모 모드: 이야기 기록 (별마다 책 한 권 → 목차 → 동화책). 소유: 역할 4.
import type { Metadata } from "next";
import StoryParentApp from "@/components/parent/StoryParentApp";
import { getSeedCopy } from "@/components/parent/seedCopy";

export const metadata: Metadata = { title: "이야기 기록 · 쫑긋" };

export default function ParentEpisodesPage() {
  return <StoryParentApp seedCopy={getSeedCopy()} initialTab="library" />;
}
