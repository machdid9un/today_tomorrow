// 아이 화면의 별(행성) 표시 정보. 소유: 역할 4.
// 별 이름·한 줄 설명의 정본은 lib/story/themes.ts(역할 3). 여기에는 그림 위치와 아이 화면 문구만 둔다.
import { THEMES, type PlanetId } from "@/lib/story/themes";

export interface PlanetView {
  id: PlanetId;
  name: string;
  tag: string;
  description: string;
  short: string;
  greeting: string;
  img: string;
  /** 그림(트림 후) 크기 */
  iw: number;
  ih: number;
  /** 그림 안에서 용이 앉는 지점(px). 행성 몸통 가운데 */
  gx: number;
  gy: number;
  /** 행성 몸통 폭(px). 모든 별을 같은 크기로 맞추는 기준 */
  bw: number;
  /** 우편함 위치(px). 편지를 열 수 있는 별만 */
  mail?: [number, number];
}

const COPY: Record<PlanetId, Omit<PlanetView, "id" | "name" | "tag">> = {
  forest: {
    description: "이름을 붙여 주면 구름이 집도 되고 다리도 되는 숲이에요. 아직 이름이 없어 깜깜한 숲에 불빛을 하나씩 켜 봐요.",
    short: "이름을 붙이면 빛나는 별",
    greeting: "몽글이가 도와줄 친구를 기다리고 있어용!",
    img: "/kid/planets/forest.webp", iw: 411, ih: 407, gx: 209, gy: 176, bw: 375, mail: [300, 185],
  },
  waterfire: {
    description: "반달 언덕 양쪽에 물방울 마을과 불씨 마을이 있어요. 서로 좋아하는데 자꾸 엇갈리는 두 마을 사이에 징검돌을 놓아 줘요.",
    short: "물방울과 불씨가 사는 별",
    greeting: "똘방이랑 타닥이가 또 엇갈렸대용!",
    img: "/kid/planets/waterfire.webp", iw: 408, ih: 425, gx: 205, gy: 202, bw: 400,
  },
  upside: {
    description: "뒤죽박죽 마법사가 말을 몽땅 뒤집어 놓은 별이에요. 친구들 말은 반대로 되지만, 네가 지은 주문만은 그대로 이루어져요.",
    short: "모든 게 반대인 별",
    greeting: "뒤뚱이가 거꾸로 주문을 기다리고 있어용!",
    img: "/kid/planets/upside.webp", iw: 370, ih: 473, gx: 184, gy: 212, bw: 335,
  },
  rainbow: {
    description: "검은 마왕이 일곱 색깔을 몽땅 빼앗아 가서 온 세상이 회색이 됐어요. 무지개 용사가 되어 색을 하나씩 되찾아요.",
    short: "일곱 색깔을 되찾는 별",
    greeting: "알록이가 무지개 용사를 기다리고 있어용!",
    img: "/kid/planets/rainbow.webp", iw: 448, ih: 451, gx: 232, gy: 212, bw: 395,
  },
};

export const PLANETS: PlanetView[] = THEMES.map((t) => ({ id: t.id, name: t.planet, tag: t.tag, ...COPY[t.id] }));

export const PLANET_KEY = "sangsang.planet";

export function readPlanet(): PlanetId {
  try {
    const v = window.localStorage.getItem(PLANET_KEY);
    if (v && PLANETS.some((p) => p.id === v)) return v as PlanetId;
  } catch {
    // 저장소가 막혀 있으면 첫 별로
  }
  return PLANETS[0].id;
}

export function savePlanet(id: PlanetId) {
  try {
    window.localStorage.setItem(PLANET_KEY, id);
  } catch {
    // 저장 실패해도 이번 회차는 그대로 진행
  }
}

/** 모든 별의 몸통 폭을 이 값(viewBox 단위)으로 맞춘다 */
export const PLANET_BODY = 270;
/** 용이 앉는 지점이 놓일 viewBox(440×350) 좌표 */
export const GROUND = { x: 220, y: 133 };
export const planetScale = (p: PlanetView) => PLANET_BODY / p.bw;
