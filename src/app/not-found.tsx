import Link from 'next/link';

export default function NotFound() {
  const quickLinks = [
    { href: '/', label: 'Tính thuế TNCN', icon: '🧮', desc: 'So sánh luật cũ và mới' },
    { href: '/#gross-net', label: 'GROSS ⇄ NET', icon: '💰', desc: 'Chuyển đổi lương' },
    { href: '/#overtime', label: 'Lương tăng ca', icon: '⏰', desc: 'Tính OT' },
    { href: '/#bonus-calculator', label: 'Thưởng Tết', icon: '🎁', desc: 'Tối ưu thuế thưởng' },
    { href: '/#esop-calculator', label: 'ESOP', icon: '📈', desc: 'Thuế cổ phiếu' },
    { href: '/#annual-settlement', label: 'Quyết toán', icon: '📋', desc: 'Thuế năm' },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/30">
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-primary-500/30 mb-12"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Về trang chủ
        </Link>

        {/* Quick Links */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-6">
            Công cụ phổ biến
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">{link.icon}</div>
                <div className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors">
                  {link.label}
                </div>
                <div className="text-xs text-gray-400">{link.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-gray-400">
          Thuế TNCN 2026 · So sánh luật thuế cũ và mới từ 1/7/2026
        </p>
      </div>
    </main>
  );
}
