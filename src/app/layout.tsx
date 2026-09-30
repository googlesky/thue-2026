import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, IBM_Plex_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider, themeScript } from '@/contexts/ThemeContext';
import { PWAProvider } from '@/components/ui';

const GA_MEASUREMENT_ID = 'G-E2MGYR8HY4';

// Chữ chính: Be Vietnam Pro - thiết kế cho tiếng Việt, dấu thanh chuẩn
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

// Chữ số liệu: IBM Plex Mono - số tiền, số hiệu văn bản (chất sổ kế toán)
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
  preload: false,
});

const baseUrl = 'https://thue.1devops.io';
const siteName = 'Tính Thuế TNCN 2026';
const title = 'Tính Thuế TNCN 2026 | So sánh Luật Thuế Cũ và Mới Việt Nam';
const description =
  'Công cụ tính thuế thu nhập cá nhân Việt Nam miễn phí, cập nhật Luật 109/2025/QH15 và Nghị định 253/2026. So sánh luật cũ (7 bậc) với biểu thuế 5 bậc áp dụng từ 2026. Tính GROSS-NET, quyết toán thuế, thưởng Tết, ESOP.';

export const metadata: Metadata = {
  // Basic metadata
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    'thuế TNCN',
    'thuế thu nhập cá nhân',
    'tính thuế 2026',
    'luật thuế mới',
    'thuế Việt Nam',
    'GROSS NET',
    'quyết toán thuế',
    'giảm trừ gia cảnh',
    'biểu thuế lũy tiến',
    'thuế thưởng Tết',
    'thuế ESOP',
    'thuế cổ phiếu',
    'bảo hiểm xã hội',
    'BHXH',
    'thuế thu nhập',
    'tax calculator Vietnam',
    'thuế người nước ngoài',
    'expatriate tax Vietnam',
    'thuế lao động nước ngoài',
    'quy chế cư trú 183 ngày',
    'hiệp định tránh đánh thuế hai lần',
    'thuế cho thuê nhà',
    'thuế chứng khoán',
    'thuế chuyển nhượng cổ phần',
    'thuế lương hưu',
    'tính lương tăng ca',
  ],
  authors: [{ name: '1DevOps' }],
  creator: '1DevOps',
  publisher: '1DevOps',

  // Canonical URL - ensure consistent URL format
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl + '/',
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: baseUrl,
    siteName,
    title,
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Tính Thuế TNCN 2026 - So sánh Luật Thuế Cũ và Mới',
        type: 'image/png',
      },
    ],
    countryName: 'Vietnam',
    determiner: 'auto',
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: '@1devops',
    creator: '@1devops',
    title,
    description,
    images: ['/og-image.png'],
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },

  // Manifest
  manifest: '/manifest.json',

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification (add your own verification codes)
  // verification: {
  //   google: 'your-google-verification-code',
  // },

  // Category
  category: 'finance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
};

// JSON-LD Structured Data - Enhanced for better SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteName,
  alternateName: 'Tính Thuế TNCN',
  description,
  url: baseUrl,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Modern browser recommended.',
  softwareVersion: '2.0',
  datePublished: '2025-12-01',
  dateModified: new Date().toISOString(),
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'VND',
  },
  author: {
    '@type': 'Organization',
    name: '1DevOps',
    url: 'https://1devops.io',
  },
  publisher: {
    '@type': 'Organization',
    name: '1DevOps',
    url: 'https://1devops.io',
  },
  inLanguage: 'vi-VN',
  isAccessibleForFree: true,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'Tính thuế TNCN theo luật cũ và mới',
    'Quy đổi lương GROSS - NET',
    'Tính lương tăng ca',
    'Quyết toán thuế năm',
    'Tính thuế thưởng Tết, lương tháng 13',
    'Tính thuế ESOP/cổ phiếu',
    'So sánh thuế theo năm',
    'Tra cứu biểu thuế lũy tiến',
    'Tra cứu bảo hiểm xã hội',
    'Tính thuế người nước ngoài (Expatriate Tax)',
    'Hiệp định tránh đánh thuế hai lần',
    'Ước tính lương hưu BHXH',
  ],
  screenshot: `${baseUrl}/og-image.png`,
  image: `${baseUrl}/og-image.png`,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': baseUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Theme script - prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Critical: Preconnect to font origins first */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for analytics (lower priority) */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        {/* Preload GA script for faster analytics initialization */}
        <link
          rel="preload"
          href={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          as="script"
        />
        {/* JSON-LD Structured Data - non-blocking */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '1DevOps',
              url: 'https://1devops.io',
              sameAs: ['https://github.com/googlesky/thue-2026'],
            }),
          }}
        />
        {/* FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Luật thuế TNCN mới 2026 có gì khác so với luật cũ?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Biểu thuế lũy tiến rút từ 7 bậc xuống 5 bậc (5%, 10%, 20%, 30%, 35%), bậc 35% áp dụng cho phần thu nhập tính thuế trên 100 triệu/tháng thay vì 80 triệu. Giảm trừ gia cảnh tăng từ 11 lên 15,5 triệu/tháng cho bản thân và từ 4,4 lên 6,2 triệu/tháng cho mỗi người phụ thuộc. Từ kỳ tính thuế 2026 còn được trừ hưu trí tự nguyện, bảo hiểm nhân thọ tối đa 3 triệu/tháng, chi khám chữa bệnh tối đa 23 triệu/năm và học phí tối đa 24 triệu/năm.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Khi nào luật thuế TNCN mới có hiệu lực?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Luật Thuế TNCN số 109/2025/QH15 được Quốc hội thông qua ngày 10/12/2025, có hiệu lực từ 01/7/2026; Nghị định 253/2026/NĐ-CP và Thông tư 87/2026/TT-BTC hướng dẫn cũng có hiệu lực từ 01/7/2026. Riêng thu nhập từ tiền lương, tiền công và kinh doanh của cá nhân cư trú, biểu thuế 5 bậc và giảm trừ 15,5 triệu áp dụng cho cả kỳ tính thuế năm 2026 (từ 01/01/2026); phần đã khấu trừ theo mức cũ trong 6 tháng đầu năm được điều chỉnh khi quyết toán.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'GROSS và NET trong lương là gì?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'GROSS là tổng lương trước khi trừ thuế và bảo hiểm. NET là lương thực nhận sau khi đã trừ thuế TNCN, BHXH, BHYT, BHTN. Công cụ này giúp quy đổi giữa GROSS và NET một cách chính xác.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Thuế ESOP và cổ phiếu được tính như thế nào?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Theo Nghị định 253/2026/NĐ-CP, cổ phiếu ESOP chưa bị tính thuế khi nhận. Khi bán, phần thu nhập từ tiền lương (số tiền ghi sổ kế toán, hoặc số lượng × mệnh giá trừ số tiền đã bỏ ra mua) bị khấu trừ 10% và cộng vào quyết toán năm; ngoài ra nộp 0,1% trên giá bán chứng khoán.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Làm sao để tối ưu thuế thưởng Tết?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Sử dụng Bonus Calculator để tính thuế thưởng Tết, lương tháng 13. Công cụ này giúp so sánh các phương án tính thuế để tối ưu hóa số tiền thực nhận.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Người nước ngoài làm việc tại Việt Nam đóng thuế như thế nào?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Người nước ngoài là cá nhân cư trú nếu có mặt tại Việt Nam từ 183 ngày trở lên trong năm dương lịch (hoặc 12 tháng liên tục) hoặc có nơi ở thường xuyên (thường trú, thuê nhà từ 183 ngày); khi đó áp dụng biểu lũy tiến 5–35% và được giảm trừ gia cảnh. Cá nhân không cư trú chịu thuế 20% trên thu nhập từ tiền lương phát sinh tại Việt Nam. Việt Nam có hiệp định tránh đánh thuế hai lần với khoảng 80 quốc gia, vùng lãnh thổ.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${beVietnam.variable} ${plexMono.variable} font-sans`}>
        <ThemeProvider>
          <PWAProvider>
            {/* Skip to main content link for keyboard users */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              Chuyển đến nội dung chính
            </a>
            {children}
          </PWAProvider>
        </ThemeProvider>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
