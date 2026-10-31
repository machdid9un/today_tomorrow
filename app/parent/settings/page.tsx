// 부모 모드: 설정 (아이 · 부모 확인 · 목소리와 기록 · 다른 기기 · 요금제 · 아이 모드로). 소유: 역할 4.
import type { Metadata } from "next";
import StoryParentApp from "@/components/parent/StoryParentApp";
import { getSeedCopy } from "@/components/parent/seedCopy";

export const metadata: Metadata = { title: "설정 · 상상 무전기" };

export default function ParentSettingsPage() {
  return <StoryParentApp seedCopy={getSeedCopy()} initialTab="settings" />;
}
