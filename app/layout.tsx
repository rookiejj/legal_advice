import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '묻다 — AI 법률 정보 서비스',
  description: '대한민국 법령에 근거한 AI 법률 정보 서비스.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 인앱브라우저(카카오 등) 뷰포트 대응 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  )
}