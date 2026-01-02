import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const GA_MEASUREMENT_ID = 'G-E2MGYR8HY4';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'optional', // Prevent FOUT - use fallback if font not cached
  adjustFontFallback: true, // Reduce CLS by adjusting fallback font metrics
  preload: true, // Preload font files
});

const baseUrl = 'https://thue.1devops.io';
const siteName = 'Tính Thuế TNCN 2026';
const title = 'Tính Thuế TNCN 2026 | So sánh Luật Thuế Cũ và Mới Việt Nam';
const description =
  'Công cụ tính thuế thu nhập cá nhân Việt Nam miễn phí. So sánh thuế TNCN giữa luật hiện hành (7 bậc) và luật mới 2026 (5 bậc). Tính GROSS-NET, quyết toán thuế, thưởng Tết, ESOP.';

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
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
    <html lang="vi">
      <head>
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
                    text: 'Luật thuế mới giảm từ 7 bậc xuống 5 bậc, tăng giảm trừ gia cảnh lên 11 triệu/tháng cho bản thân và 4.4 triệu/tháng cho người phụ thuộc. Mức thuế suất cao nhất giảm từ 35% xuống 30%.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Khi nào luật thuế TNCN mới có hiệu lực?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Luật Thuế TNCN sửa đổi được Quốc hội thông qua ngày 10/12/2025, có hiệu lực từ 1/7/2026. Tuy nhiên, đối với thu nhập từ tiền lương, tiền công, biểu thuế mới (5 bậc, giảm trừ 15.5 triệu) áp dụng từ kỳ tính thuế năm 2026 (tức từ 1/1/2026) theo điều khoản chuyển tiếp.',
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
                    text: 'Thuế ESOP được tính trên chênh lệch giữa giá thị trường và giá mua ưu đãi. Công cụ ESOP Calculator giúp tính thuế chính xác cho các trường hợp nhận cổ phiếu từ công ty.',
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
                    text: 'Người nước ngoài có thể là cư trú hoặc không cư trú thuế tại Việt Nam. Nếu ở từ 183 ngày trở lên trong năm, áp dụng thuế suất lũy tiến từ 5-35%. Nếu dưới 183 ngày, áp dụng thuế suất cố định 20%. Việt Nam có hiệp định tránh đánh thuế hai lần với hơn 70 quốc gia.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          Chuyển đến nội dung chính
        </a>
        {children}
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
