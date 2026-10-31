// 부모 모드: 이야기 기록 (완성된 회차 목록 → 동화책). 소유: 역할 4.
import type { Metadata } from "next";
import EpisodeList from "@/components/parent/EpisodeList";

export const metadata: Metadata = { title: "이야기 기록 · 상상 무전기" };

export default function ParentEpisodesPage() {
  return <EpisodeList />;
}
