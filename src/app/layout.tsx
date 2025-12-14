import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const GA_MEASUREMENT_ID = 'G-E2MGYR8HY4';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'optional', // Prevent FOUT - use fallback if font not cached
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
  ],
  authors: [{ name: '1DevOps' }],
  creator: '1DevOps',
  publisher: '1DevOps',

  // Canonical URL
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: '/',
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
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
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

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteName,
  description,
  url: baseUrl,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
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
  inLanguage: 'vi-VN',
  isAccessibleForFree: true,
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
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
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
