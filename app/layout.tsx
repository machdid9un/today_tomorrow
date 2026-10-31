import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "쫑긋 — 목소리로 만드는 잠자리 이야기", template: "%s · 쫑긋" },
  description: "화면을 바라보지 않고, 아이의 목소리로 만들어 가는 잠자리 모험.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
