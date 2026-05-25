import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공시리 — Disclosure AI",
  description: "관심종목 공시 자동 모니터링 및 작전주 위험 판별 AI 에이전트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" style={{ height: '100%' }}>
      <body style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>{children}</body>
    </html>
  );
}
