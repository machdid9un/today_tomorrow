// 씨앗 프리셋 → 장면 지시문 표. 소유: 역할 3.
// TODO(역할 3): 프리셋 5개 각각의 장면 지시문 문구를 작성.
import type { SeedPreset } from "@/types";

export const SEED_PRESET_SCENE_DIRECTIVES: Record<
  Exclude<SeedPreset, "custom">,
  string
> = {
  friend: "", // TODO: 동료를 두고 가야 하는 갈림길 장면
  school: "", // TODO
  sibling: "", // TODO
  fear: "", // TODO
  new_place: "", // TODO
};

export async function convertFreeTextSeedToDirective(
  _rawText: string
): Promise<string> {
  throw new Error("Not implemented");
}
