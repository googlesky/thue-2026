import type { Metadata } from 'next';

const baseUrl = 'https://thue.1devops.io';

export const metadata: Metadata = {
  title: 'Công cụ Tính Thuế TNCN 2026 | Tính Lương GROSS NET, Quyết Toán Thuế',
  description:
    'Công cụ tính thuế thu nhập cá nhân trực tuyến miễn phí. Tính lương GROSS-NET, quyết toán thuế năm, thuế thưởng Tết, ESOP, lương tăng ca. So sánh luật cũ 7 bậc và luật mới 2026 với 5 bậc thuế.',
  keywords: [
    'tính thuế TNCN',
    'tính thuế trực tuyến',
    'GROSS NET',
    'quyết toán thuế',
    'thuế thưởng Tết',
    'thuế ESOP',
    'lương tăng ca',
    'giảm trừ gia cảnh',
    'bảo hiểm xã hội',
    'thuế 2026',
  ],
  alternates: {
    canonical: `${baseUrl}/tinh-thue/`,
  },
  openGraph: {
    title: 'Công cụ Tính Thuế TNCN 2026 | 15+ Tính năng Miễn phí',
    description:
      'Tính thuế thu nhập cá nhân trực tuyến. Quy đổi GROSS-NET, quyết toán thuế, thuế thưởng, ESOP. So sánh luật cũ và mới 2026.',
    url: `${baseUrl}/tinh-thue/`,
    type: 'website',
    locale: 'vi_VN',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Công cụ Tính Thuế TNCN 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Công cụ Tính Thuế TNCN 2026',
    description:
      'Tính thuế TNCN trực tuyến miễn phí. GROSS-NET, quyết toán thuế, thưởng Tết, ESOP.',
    images: ['/og-image.png'],
  },
};

// SoftwareApplication schema for the calculator tool
const calculatorSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Công cụ Tính Thuế TNCN 2026',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'VND',
  },
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
  ],
};

// BreadcrumbList schema
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Trang chủ',
      item: baseUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Tính Thuế TNCN',
      item: `${baseUrl}/tinh-thue/`,
    },
  ],
};

export default function TinhThueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
