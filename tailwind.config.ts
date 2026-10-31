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
        night: "#171C3A",
        paper: "#FFFFFF",
        ink: "#1B1F2E",
        signal: "#FF7A1A",
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
