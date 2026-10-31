// 마음 담기 문구 (서버 전용). 정본은 lib/story/seedPresets.ts — 그 모듈은 llm을 가져오므로 서버 페이지에서만 부른다. 소유: 역할 4.
import { SEED_OPTIONS, SEED_PRESET_PARENT_COPY, SEED_SECTION_COPY } from "@/lib/story/seedPresets";
import type { SeedSectionCopy } from "./parentData";

export function getSeedCopy(): SeedSectionCopy {
  return {
    title: SEED_SECTION_COPY.title,
    body: SEED_SECTION_COPY.body,
    cta: SEED_SECTION_COPY.cta,
    options: SEED_OPTIONS.map((preset) => ({
      preset,
      label: SEED_PRESET_PARENT_COPY[preset].label,
      desc: SEED_PRESET_PARENT_COPY[preset].desc,
    })),
  };
}
