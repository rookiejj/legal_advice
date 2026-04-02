import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '법망 — AI 법률 정보 서비스',
  description: '대한민국 법령에 근거한 AI 법률 정보 서비스. 임대차, 노동법, 가족법 등 실생활 법률 정보를 제공합니다.',
  keywords: '법률, 법령, 임대차, 노동법, AI 법률 상담',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  )
}
