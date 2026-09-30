import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 - Không tìm thấy trang',
  description: 'Trang bạn đang tìm kiếm không tồn tại. Khám phá các công cụ tính thuế TNCN 2026, chuyển đổi GROSS-NET, tính thuế thưởng Tết, ESOP.',
  robots: {
    index: false,
    follow: true,
  },
};

// JSON-LD structured data for 404 page
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '404 - Không tìm thấy trang',
  description: 'Trang bạn đang tìm kiếm không tồn tại. Khám phá các công cụ tính thuế TNCN 2026.',
  url: 'https://thue.1devops.io/404',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang chủ',
        item: 'https://thue.1devops.io',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '404',
      },
    ],
  },
};

export default function NotFound() {
  const quickLinks = [
    { href: '/tinh-thue', label: 'Tính thuế TNCN', desc: 'So sánh luật cũ và mới' },
    { href: '/tinh-thue#gross-net', label: 'GROSS ⇄ NET', desc: 'Chuyển đổi lương' },
    { href: '/tinh-thue#overtime', label: 'Lương tăng ca', desc: 'Tính OT' },
    { href: '/tinh-thue#bonus-calculator', label: 'Thưởng Tết', desc: 'Tối ưu thuế thưởng' },
    { href: '/tinh-thue#esop-calculator', label: 'ESOP', desc: 'Thuế cổ phiếu' },
    { href: '/tinh-thue#annual-settlement', label: 'Quyết toán', desc: 'Thuế năm' },
  ];

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-paper">
        <div className="max-w-2xl w-full text-center">
          {/* Error Message */}
          <h1 className="font-data text-6xl font-bold text-primary-700 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-primary-600 mb-4">
            Không tìm thấy trang
          </h2>
          <p className="text-primary-500 mb-8 max-w-md mx-auto">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
            Hãy thử một trong các công cụ bên dưới.
          </p>

          {/* Back to Home Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors mb-12"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Về trang chủ
          </Link>

          {/* Quick Links */}
          <div className="border-t border-line pt-8">
            <h3 className="eyebrow mb-6">Công cụ phổ biến</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group block p-4 bg-white rounded-[10px] border border-line shadow-xs hover:border-primary-300 transition-colors"
                >
                  <div className="font-semibold text-primary-700 group-hover:underline underline-offset-4 decoration-primary-200">
                    {link.label}
                  </div>
                  <div className="text-xs text-primary-400 mt-1">{link.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-12 text-sm text-primary-400">
            Thuế TNCN 2026 · So sánh luật thuế cũ và mới từ 1/1/2026
          </p>
        </div>
      </main>
    </>
  );
}
