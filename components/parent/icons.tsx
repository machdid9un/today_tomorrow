// 부모 화면 인라인 SVG 아이콘. 소유: 역할 4. (외부 아이콘 라이브러리 없음)
import type { MoodWeather } from "@/lib/story/reportGenerator";

interface IconProps {
  className?: string;
  size?: number;
}

const SUN = "#ffb547";
const SUN_STROKE = "#ef9618";
const CLOUD_STROKE = "#6f6a8a";
const RAIN = "#5b84d6";

/** 24×24 구름 (아래 끝 y=19, 가로 약 4.3–20.2) */
const CLOUD_PATH = "M8 19h8.5a3.5 3.5 0 0 0 .3-6.99 5 5 0 0 0-9.6 1.2A2.9 2.9 0 0 0 8 19z";

function SunGlyph({ cx, cy, r, ray }: { cx: number; cy: number; r: number; ray: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(a) * (r + 1.6);
    const y1 = cy + Math.sin(a) * (r + 1.6);
    const x2 = cx + Math.cos(a) * (r + 1.6 + ray);
    const y2 = cy + Math.sin(a) * (r + 1.6 + ray);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
  return (
    <g>
      <g stroke={SUN_STROKE} strokeWidth={1.6} strokeLinecap="round">
        {rays}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} stroke={SUN_STROKE} strokeWidth={1.4} />
    </g>
  );
}

/** 요일 칸·하루 리포트용 작은 마음 날씨 아이콘 (장식: 글자 라벨을 함께 둘 것) */
export function WeatherIcon({ weather, size = 24, className }: IconProps & { weather: MoodWeather }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      {weather === "sunny" && <SunGlyph cx={12} cy={12} r={4.2} ray={2.6} />}
      {weather === "partly_cloudy" && (
        <>
          <SunGlyph cx={8.6} cy={8.4} r={3.3} ray={1.9} />
          <path d={CLOUD_PATH} transform="translate(4.2 3.6) scale(0.8)" fill="#fffaf2" stroke={CLOUD_STROKE} strokeWidth={1.75} strokeLinejoin="round" />
        </>
      )}
      {weather === "cloudy" && (
        <>
          <path d={CLOUD_PATH} transform="translate(8.4 0.6) scale(0.66)" fill="#e6e1f2" stroke={CLOUD_STROKE} strokeWidth={2.1} strokeLinejoin="round" />
          <path d={CLOUD_PATH} transform="translate(-0.6 1.6)" fill="#fffaf2" stroke={CLOUD_STROKE} strokeWidth={1.4} strokeLinejoin="round" />
        </>
      )}
      {weather === "rainy" && (
        <>
          <path d={CLOUD_PATH} transform="translate(0 -3.2)" fill="#eef1fb" stroke={CLOUD_STROKE} strokeWidth={1.4} strokeLinejoin="round" />
          <g stroke={RAIN} strokeWidth={1.6} strokeLinecap="round">
            <line x1={9} y1={18.2} x2={8} y2={20.8} />
            <line x1={13} y1={18.2} x2={12} y2={20.8} />
            <line x1={17} y1={18.2} x2={16} y2={20.8} />
          </g>
        </>
      )}
    </svg>
  );
}

/** 주간 카드의 큰 그림 (날씨가 없으면 달) */
export function WeatherIllustration({ weather, className }: { weather: MoodWeather | null; className?: string }) {
  const cloud = (x: number, y: number, s: number, fill = "#ffffff") => (
    <path d={CLOUD_PATH} transform={`translate(${x} ${y}) scale(${s})`} fill={fill} />
  );
  return (
    <svg viewBox="0 0 120 104" className={className} aria-hidden="true">
      {weather === null && (
        <>
          <circle cx={60} cy={48} r={38} fill="#fff1d2" opacity={0.7} />
          <path d="M74 66a27 27 0 0 1-31-41 27 27 0 1 0 31 41z" fill="#ffe2a2" stroke="#f3c766" strokeWidth={2} />
          <circle cx={88} cy={24} r={2.4} fill="#ffb547" />
          <circle cx={30} cy={70} r={1.8} fill="#ffb547" />
        </>
      )}
      {(weather === "sunny" || weather === "partly_cloudy") && (
        <>
          <circle cx={58} cy={44} r={38} fill="#ffe2a2" opacity={0.75} />
          <circle cx={58} cy={44} r={27} fill={SUN} />
          {weather === "sunny" ? cloud(66, 50, 2.3) : cloud(46, 40, 3.2)}
        </>
      )}
      {weather === "cloudy" && (
        <>
          <circle cx={50} cy={36} r={22} fill="#ffe2a2" opacity={0.8} />
          {cloud(44, 6, 3, "#f3eefc")}
          {cloud(16, 30, 3.6)}
        </>
      )}
      {weather === "rainy" && (
        <>
          {cloud(18, 0, 3.8, "#eef1fb")}
          <g stroke={RAIN} strokeWidth={4} strokeLinecap="round">
            <line x1={44} y1={84} x2={40} y2={96} />
            <line x1={62} y1={84} x2={58} y2={96} />
            <line x1={80} y1={84} x2={76} y2={96} />
          </g>
        </>
      )}
    </svg>
  );
}

function Stroke({ size = 24, className, children, strokeWidth = 1.8 }: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const ChevronDown = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 9 6 6 6-6" />
  </Stroke>
);
export const ChevronRight = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m9 6 6 6-6 6" />
  </Stroke>
);
export const ChevronLeft = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m15 6-6 6 6 6" />
  </Stroke>
);
export const CheckIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={2.2}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
);

/** 하단 탭: 마음 리포트 */
export const ReportNavIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx={12} cy={12} r={3.2} />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2.5M18 12h2.5" />
  </Stroke>
);
/** 하단 탭: 이야기 기록 */
export const BookNavIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x={4} y={4.5} width={7} height={15} rx={1.6} />
    <rect x={13} y={4.5} width={7} height={15} rx={1.6} />
  </Stroke>
);
/** 하단 탭: 설정 (Feather settings, MIT) */
export const GearNavIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={1.6}>
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Stroke>
);

export const MoonIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={1.6}>
    <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />
  </Stroke>
);

export const PlanetIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={1.6}>
    <circle cx={12} cy={12} r={5.5} />
    <path d="M4.2 15.6c-1.5 1.7-1.9 3-1.2 3.6 1.3 1.1 6.4-1.5 11.4-5.8s8.1-8.9 6.8-10c-.7-.6-2.1-.2-3.9 1" />
  </Stroke>
);

export const BookOpenIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={1.7}>
    <path d="M12 7c-1.6-1.4-4-2-7.5-2v12c3.5 0 5.9.6 7.5 2 1.6-1.4 4-2 7.5-2V5C16 5 13.6 5.6 12 7z" />
    <path d="M12 7v12" />
  </Stroke>
);

export const HeartNoteIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={1.7}>
    <path d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.6 12 19 12 19z" />
  </Stroke>
);

export const SoftAlertIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={1.8}>
    <circle cx={12} cy={12} r={8.5} />
    <path d="M12 8v4.5" />
    <path d="M12 16h.01" />
  </Stroke>
);
