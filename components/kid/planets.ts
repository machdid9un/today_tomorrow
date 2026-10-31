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
    description: "폭신한 나무 사이로 작은 집이 보여요. 이야기 용과 함께 우리만의 숲을 만들어 봐요.",
    short: "우리의 첫 번째 별",
    greeting: "이름 없는 나무가 기다리고 있어용!",
    img: "/kid/planets/forest.webp", iw: 411, ih: 407, gx: 209, gy: 176, bw: 375, mail: [300, 185],
  },
  waterfire: {
    description: "왼쪽은 찰랑찰랑 물방울 마을, 오른쪽은 몽글몽글 불씨 마을. 두 마을을 친구로 만들어 볼까요?",
    short: "물방울과 불씨가 사는 별",
    greeting: "물방울이랑 불씨가 또 다퉜대용!",
    img: "/kid/planets/waterfire.webp", iw: 408, ih: 425, gx: 205, gy: 202, bw: 400,
  },
  upside: {
    description: "비는 하늘로 올라가고, 집은 지붕으로 서 있어요. 이 별에서는 말이 거꾸로 일어나요.",
    short: "모든 게 반대인 별",
    greeting: "안녕은 잘 가, 빨리는 천천히용!",
    img: "/kid/planets/upside.webp", iw: 370, ih: 473, gx: 184, gy: 212, bw: 335,
  },
  rainbow: {
    description: "색깔 친구들이 숨바꼭질 중이에요. 색을 불러 주면 숨어 있던 색깔이 돌아와요.",
    short: "색깔을 찾아 주는 별",
    greeting: "색깔 친구들이 숨바꼭질 중이래용!",
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
