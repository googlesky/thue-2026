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
    { href: '/tinh-thue', label: 'Tính thuế TNCN', icon: '🧮', desc: 'So sánh luật cũ và mới' },
    { href: '/tinh-thue#gross-net', label: 'GROSS ⇄ NET', icon: '💰', desc: 'Chuyển đổi lương' },
    { href: '/tinh-thue#overtime', label: 'Lương tăng ca', icon: '⏰', desc: 'Tính OT' },
    { href: '/tinh-thue#bonus-calculator', label: 'Thưởng Tết', icon: '🎁', desc: 'Tối ưu thuế thưởng' },
    { href: '/tinh-thue#esop-calculator', label: 'ESOP', icon: '📈', desc: 'Thuế cổ phiếu' },
    { href: '/tinh-thue#annual-settlement', label: 'Quyết toán', icon: '📋', desc: 'Thuế năm' },
  ];

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        <div className="max-w-2xl w-full text-center relative z-10">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30">
            <span className="text-5xl">🔍</span>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Không tìm thấy trang
        </h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
          Hãy thử một trong các công cụ bên dưới.
        </p>

        {/* Back to Home Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/30 mb-12"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Về trang chủ
        </Link>

        {/* Quick Links */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">
            Công cụ phổ biến
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="text-2xl mb-2">{link.icon}</div>
                <div className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                  {link.label}
                </div>
                <div className="text-xs text-gray-500">{link.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-gray-500">
          Thuế TNCN 2026 · So sánh luật thuế cũ và mới từ 1/1/2026
        </p>
        </div>
      </main>
    </>
  );
}
