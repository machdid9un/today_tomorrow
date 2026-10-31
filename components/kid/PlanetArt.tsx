// 별 그림 한 장. viewBox 440×350 안에서 용이 앉는 지점이 늘 (220,133)에 오도록 놓는다. 소유: 역할 4.
import { GROUND, planetScale, type PlanetView } from "./planets";

export default function PlanetArt({ planet, className }: { planet: PlanetView; className?: string }) {
  const k = planetScale(planet);
  const w = planet.iw * k;
  const h = planet.ih * k;
  const x = GROUND.x - planet.gx * k;
  const y = GROUND.y - planet.gy * k;
  return (
    <svg className={className} viewBox="0 0 440 350" role="img" aria-label={`${planet.name} 풍경`}>
      <ellipse cx="220" cy={Math.min(y + h - 4, 342)} rx={w * 0.36} ry="10" fill="#13142a" opacity="0.2" />
      <image href={planet.img} x={x} y={y} width={w} height={h} />
    </svg>
  );
}
