import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'optional', // Prevent FOUT - use fallback if font not cached
})

export const metadata: Metadata = {
  title: 'Tính Thuế TNCN 2026 - So sánh Luật Cũ và Mới',
  description: 'Công cụ tính thuế thu nhập cá nhân Việt Nam, so sánh giữa luật hiện hành và luật mới áp dụng từ 1/7/2026',
  keywords: 'thuế TNCN, thuế thu nhập cá nhân, 2026, Việt Nam, tính thuế, so sánh thuế',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
