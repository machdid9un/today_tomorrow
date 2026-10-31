import type { Config } from "tailwindcss";

// 디자인 토큰 (역할 4 소유, README §6 참고)
// 밤 #171C3A / 종이 #FFFFFF / 잉크 #1B1F2E
// 주황 #FF7A1A - 말하기·한마디 CTA 전용
// 하늘 #7AD7FF - 신호 표시 전용
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // story-planets 시안 토큰 (README §6 역할 4). app/globals.css의 CSS 변수와 같은 값
        night: "#20213D",
        paper: "#FFFAF2",
        ink: "#20213D",
        cream: "#FFF4DF",
        muted: "#565073",
        coral: "#FF876E", // CTA. 대비를 위해 CTA 글자는 night(남색)
        lavender: "#B6ABD9",
        star: "#FFE2A2",
        signal: "#FF876E", // 옛 이름 호환 (= coral)
        sky: "#7AD7FF",
      },
      fontFamily: {
        display: ["Jua", "sans-serif"],
        sans: ["Noto Sans KR", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
