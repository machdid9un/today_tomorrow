"use client";
// 이야기 용: 눈동자를 뺀 그림 위에 눈동자를 그려서, 손가락·마우스 쪽을 바라보게 한다. 소유: 역할 4.
// 역할 2의 모험 화면에서도 그대로 가져다 쓸 수 있다 (<Dragon /> 하나면 됨).
import { useEffect, useId, useRef } from "react";

const SIZE = 1254;
const EYES = {
  near: { cx: 677, cy: 549, rx: 25, ry: 19 },
  far: { cx: 902, cy: 470, rx: 15, ry: 12 },
} as const;

export default function Dragon({
  className,
  label = "이야기 용",
  track = true,
}: {
  className?: string;
  label?: string;
  /** false면 눈동자가 가운데에 머문다 */
  track?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!track) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pupils = Array.from(svg.querySelectorAll<SVGGElement>("[data-eye]"));
    const look = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const x = ((e.clientX - r.left) / r.width) * SIZE;
      const y = ((e.clientY - r.top) / r.height) * SIZE;
      for (const p of pupils) {
        const eye = EYES[p.dataset.eye as keyof typeof EYES];
        const vx = x - eye.cx;
        const vy = y - eye.cy;
        const d = Math.hypot(vx, vy) || 1;
        const a = Math.min(1, d / 400);
        p.style.transform = `translate(${(vx / d) * a * eye.rx}px, ${(vy / d) * a * eye.ry}px)`;
      }
    };
    const rest = () => pupils.forEach((p) => (p.style.transform = ""));
    window.addEventListener("pointermove", look, { passive: true });
    window.addEventListener("pointerdown", look, { passive: true });
    document.documentElement.addEventListener("pointerleave", rest);
    return () => {
      window.removeEventListener("pointermove", look);
      window.removeEventListener("pointerdown", look);
      document.documentElement.removeEventListener("pointerleave", rest);
    };
  }, [track]);

  return (
    <svg ref={svgRef} className={className} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id={`${id}iris`} cx=".3" cy=".25" r=".85">
          <stop stopColor="#9a78c5" />
          <stop offset=".52" stopColor="#694591" />
          <stop offset="1" stopColor="#352144" />
        </radialGradient>
        <clipPath id={`${id}near`}>
          <path d="M610 608C590 591 591 555 607 527C626 489 662 482 692 498C720 513 734 537 735 562C718 587 646 613 610 608Z" />
        </clipPath>
        <clipPath id={`${id}far`}>
          <path d="M864 499C845 472 848 434 865 424C889 410 915 431 931 455C942 472 948 491 945 504C928 519 901 520 864 499Z" />
        </clipPath>
      </defs>
      <image href="/kid/yong-eyebase.webp" width={SIZE} height={SIZE} />
      <g clipPath={`url(#${id}near)`}>
        <g data-eye="near" style={{ transition: "transform 90ms linear" }}>
          <ellipse cx="677" cy="549" rx="44" ry="54" transform="rotate(-22 677 549)" fill={`url(#${id}iris)`} />
          <ellipse cx="683" cy="549" rx="31" ry="45" transform="rotate(-22 683 549)" fill="#21172e" />
          <ellipse cx="664" cy="525" rx="10" ry="12" fill="#fff9f1" />
          <circle cx="697" cy="568" r="4" fill="#bba3de" />
        </g>
      </g>
      <g clipPath={`url(#${id}far)`}>
        <g data-eye="far" style={{ transition: "transform 90ms linear" }}>
          <ellipse cx="902" cy="470" rx="31" ry="45" transform="rotate(-28 902 470)" fill={`url(#${id}iris)`} />
          <ellipse cx="906" cy="470" rx="22" ry="37" transform="rotate(-28 906 470)" fill="#21172e" />
          <ellipse cx="890" cy="448" rx="7" ry="9" fill="#fff9f1" />
          <circle cx="917" cy="486" r="3" fill="#bba3de" />
        </g>
      </g>
    </svg>
  );
}
