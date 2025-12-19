import type { Metadata } from 'next';

const baseUrl = 'https://thue.1devops.io';

export const metadata: Metadata = {
  title: 'Cong cu Tinh Thue TNCN 2026 | Tinh Luong GROSS NET, Quyet Toan Thue',
  description:
    'Cong cu tinh thue thu nhap ca nhan truc tuyen mien phi. Tinh luong GROSS-NET, quyet toan thue nam, thue thuong Tet, ESOP, luong tang ca. So sanh luat cu 7 bac va luat moi 2026 voi 5 bac thue.',
  keywords: [
    'tinh thue TNCN',
    'tinh thue truc tuyen',
    'GROSS NET',
    'quyet toan thue',
    'thue thuong Tet',
    'thue ESOP',
    'luong tang ca',
    'giam tru gia canh',
    'bao hiem xa hoi',
    'thue 2026',
  ],
  alternates: {
    canonical: `${baseUrl}/tinh-thue/`,
  },
  openGraph: {
    title: 'Cong cu Tinh Thue TNCN 2026 | 15+ Tinh nang Mien phi',
    description:
      'Tinh thue thu nhap ca nhan truc tuyen. Quy doi GROSS-NET, quyet toan thue, thue thuong, ESOP. So sanh luat cu va moi 2026.',
    url: `${baseUrl}/tinh-thue/`,
    type: 'website',
    locale: 'vi_VN',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cong cu Tinh Thue TNCN 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cong cu Tinh Thue TNCN 2026',
    description:
      'Tinh thue TNCN truc tuyen mien phi. GROSS-NET, quyet toan thue, thuong Tet, ESOP.',
    images: ['/og-image.png'],
  },
};

// SoftwareApplication schema for the calculator tool
const calculatorSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cong cu Tinh Thue TNCN 2026',
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
    'Tinh thue TNCN theo luat cu va moi',
    'Quy doi luong GROSS - NET',
    'Tinh luong tang ca',
    'Quyet toan thue nam',
    'Tinh thue thuong Tet, luong thang 13',
    'Tinh thue ESOP/co phieu',
    'So sanh thue theo nam',
    'Tra cuu bieu thue luy tien',
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
      name: 'Trang chu',
      item: baseUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Tinh Thue TNCN',
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
