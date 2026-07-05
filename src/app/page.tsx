import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroCompare from '@/components/HeroCompare';
import { TAB_GROUPS } from '@/lib/tabCatalog';

/**
 * Trang chủ - "Luật đổi. Lương bạn đổi bao nhiêu?"
 *
 * Việc duy nhất của trang: cho người lao động thấy ngay luật nào vừa/sắp đổi
 * và thực nhận của họ thay đổi thế nào - trước khi mời dùng công cụ chi tiết.
 */

// Sổ thay đổi luật: nội dung thật, đã đối chiếu văn bản (xem chú nguồn cuối trang)
const LAW_CHANGES: {
  effective: string;
  stampLabel: string;
  status: string;
  items: { label: string; before: string; after: string; affects: string; href?: string }[];
}[] = [
  {
    effective: '01/01/2026',
    stampLabel: 'Từ 01/01/2026',
    status: 'Đang áp dụng từ đầu năm',
    items: [
      {
        label: 'Biểu thuế lũy tiến',
        before: '7 bậc, 35% từ 80tr',
        after: '5 bậc, 35% từ 100tr',
        affects: 'Mọi người làm công ăn lương',
        href: '/tinh-thue#table',
      },
      {
        label: 'Giảm trừ bản thân',
        before: '11.000.000 đ/tháng',
        after: '15.500.000 đ/tháng',
        affects: 'Mọi người nộp thuế TNCN',
      },
      {
        label: 'Giảm trừ người phụ thuộc',
        before: '4.400.000 đ/người',
        after: '6.200.000 đ/người',
        affects: 'Người nuôi con, cha mẹ già',
      },
      {
        label: 'Lương tối thiểu vùng I',
        before: '4.960.000 đ',
        after: '5.310.000 đ',
        affects: 'Lao động lương thấp; trần BHTN tăng theo',
        href: '/tinh-thue#insurance',
      },
      {
        label: 'Hộ, cá nhân kinh doanh',
        before: 'Miễn thuế đến 500tr/năm',
        after: 'Miễn thuế đến 1 tỷ/năm',
        affects: 'Hộ kinh doanh, bán hàng online, cho thuê nhà',
        href: '/tinh-thue#household-business',
      },
    ],
  },
  {
    effective: '01/07/2026',
    stampLabel: 'Từ 01/07/2026',
    status: 'Vừa có hiệu lực',
    items: [
      {
        label: 'Trần đóng BHXH, BHYT',
        before: '46,8tr (lương cơ sở 2,34tr)',
        after: '50,6tr (lương cơ sở 2,53tr)',
        affects: 'Ai lương trên 46,8tr/tháng: đóng thêm, thực nhận giảm',
        href: '/tinh-thue#insurance',
      },
      {
        label: 'Ngưỡng thuế theo từng lần nhận',
        before: 'Miễn phần dưới 10tr',
        after: 'Miễn phần dưới 20tr',
        affects: 'Trúng thưởng, thừa kế, quà tặng, bản quyền',
        href: '/tinh-thue#other-income',
      },
      {
        label: 'Vàng miếng, tài sản số',
        before: 'Chưa thu thuế chuyển nhượng',
        after: '0,1% giá trị mỗi lần bán',
        affects: 'Người bán vàng miếng, crypto',
        href: '/tinh-thue#gold-tax',
      },
      {
        label: 'Tên miền .vn, tín chỉ carbon, biển số đấu giá',
        before: 'Chưa quy định riêng',
        after: '5% phần vượt 20tr mỗi lần',
        affects: 'Người chuyển nhượng các tài sản này',
        href: '/tinh-thue#special-income',
      },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Vì sao thực nhận của tôi tăng từ 2026?',
    a: 'Luật 109/2025/QH15 nâng giảm trừ bản thân từ 11 lên 15,5 triệu/tháng và giãn biểu thuế còn 5 bậc. Phần lớn người làm công ăn lương nộp thuế ít hơn, nên thực nhận tăng.',
  },
  {
    q: 'Vì sao từ 01/07/2026 lương tôi lại giảm nhẹ?',
    a: 'Lương cơ sở tăng lên 2,53 triệu kéo trần đóng BHXH, BHYT từ 46,8 lên 50,6 triệu. Nếu lương bạn trên 46,8 triệu/tháng, phần đóng bảo hiểm tăng nên thực nhận giảm một chút; đổi lại mức hưởng BHXH sau này tính trên nền cao hơn.',
  },
  {
    q: 'Số liệu ở đây lấy từ đâu?',
    a: 'Toàn bộ công thức bám theo văn bản gốc: Luật 109/2025/QH15, Nghị quyết 110/2025/UBTVQH15, Nghị định 293/2025/NĐ-CP, Nghị định 141/2026/NĐ-CP. Mỗi mốc hiệu lực được tính đúng theo ngày.',
  },
  {
    q: 'Tôi cần khai gì để dùng công cụ?',
    a: 'Không cần đăng ký hay nhập thông tin cá nhân. Mọi phép tính chạy ngay trên trình duyệt của bạn.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <Header variant="solid" showSpacer={true} />

      {/* ===== Hero: luận đề + phiếu so sánh ===== */}
      <section className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="max-w-xl">
              <p className="font-data text-xs font-semibold tracking-[0.08em] text-seal uppercase mb-5">
                Luật 109/2025/QH15 · NĐ 141/2026/NĐ-CP
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-primary-700 leading-[1.08] mb-6">
                Luật đổi.
                <br />
                Lương bạn đổi bao nhiêu?
              </h1>
              <p className="text-lg text-primary-500 leading-relaxed mb-8">
                Năm 2026 có hai đợt thay đổi chạm vào lương của người lao động:
                thuế giảm từ 01/01 và trần bảo hiểm tăng từ 01/07. Nhập lương
                của bạn để thấy chênh lệch thực nhận qua từng mốc — tính đúng
                theo văn bản luật, không cần đăng ký.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/tinh-thue"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Tính chi tiết trường hợp của bạn
                </Link>
                <a
                  href="#thay-doi"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-primary-600 font-semibold rounded-lg border border-line hover:border-primary-300 bg-white transition-colors"
                >
                  Xem điều gì thay đổi
                </a>
              </div>

              {/* Ba con số cốt lõi của đợt đổi luật */}
              <ul className="mt-10 pt-6 border-t border-line space-y-3 max-w-md">
                {[
                  { label: 'Giảm trừ bản thân', value: '11tr → 15,5tr đ/tháng' },
                  { label: 'Biểu thuế lũy tiến', value: '7 bậc → 5 bậc' },
                  { label: 'Trần BHXH · BHYT (từ 01/07)', value: '46,8tr → 50,6tr đ' },
                ].map((row) => (
                  <li key={row.label} className="leader-row">
                    <span className="leader-label text-sm text-primary-500">{row.label}</span>
                    <span className="leader-dots" aria-hidden />
                    <span className="font-data text-sm font-semibold text-primary-700 whitespace-nowrap">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <HeroCompare />
          </div>
        </div>
      </section>

      {/* ===== Sổ thay đổi luật ===== */}
      <section id="thay-doi" className="border-b border-line scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl mb-10">
            <p className="eyebrow mb-3">Sổ thay đổi</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary-700 mb-3">
              Điều gì thay đổi trong 2026?
            </h2>
            <p className="text-primary-500">
              Từng khoản mục, trước và sau, kèm nhóm người bị ảnh hưởng — đối
              chiếu trực tiếp từ văn bản luật.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {LAW_CHANGES.map((milestone) => (
              <div key={milestone.effective} className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line bg-primary-50/50">
                  <span className="stamp">{milestone.stampLabel}</span>
                  <span className="text-xs text-primary-400">{milestone.status}</span>
                </div>
                <ul className="divide-y divide-line">
                  {milestone.items.map((item) => (
                    <li key={item.label} className="px-5 sm:px-6 py-4">
                      <div className="flex items-baseline justify-between gap-x-3 gap-y-1 flex-wrap">
                        <p className="font-semibold text-primary-700 text-sm">
                          {item.href ? (
                            <Link
                              href={item.href}
                              className="hover:underline underline-offset-4 decoration-primary-200"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            item.label
                          )}
                        </p>
                        <p className="font-data text-[13px] text-primary-600">
                          <span className="text-primary-400 line-through decoration-seal/40">
                            {item.before}
                          </span>{' '}
                          <span aria-hidden>→</span>{' '}
                          <span className="font-semibold">{item.after}</span>
                        </p>
                      </div>
                      <p className="text-xs text-primary-400 mt-1.5">
                        Ảnh hưởng: {item.affects}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Danh mục công cụ ===== */}
      <section id="cong-cu" className="border-b border-line scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl mb-10">
            <p className="eyebrow mb-3">Bộ công cụ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary-700 mb-3">
              Tính cho đúng trường hợp của bạn
            </h2>
            <p className="text-primary-500">
              {TAB_GROUPS.reduce((n, g) => n + g.tabs.length, 0)} công cụ dùng
              chung một nguồn công thức, chia theo việc bạn cần làm.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
            {TAB_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="eyebrow pb-3 border-b border-line mb-1">
                  {group.label}
                  <span className="font-data text-primary-300 ml-2">
                    {String(group.tabs.length).padStart(2, '0')}
                  </span>
                </p>
                <ul>
                  {group.tabs.map((tab) => (
                    <li key={tab.id}>
                      <Link
                        href={`/tinh-thue#${tab.id}`}
                        className="group flex items-baseline justify-between gap-3 py-2.5 border-b border-line/60 hover:border-primary-300 transition-colors"
                      >
                        <span className="text-sm font-medium text-primary-600 group-hover:text-primary-700">
                          {tab.label}
                        </span>
                        <span className="text-xs text-primary-300 text-right hidden sm:block">
                          {tab.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Hỏi nhanh + nguồn ===== */}
      <section className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div>
              <p className="eyebrow mb-3">Hỏi nhanh</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-primary-700">
                Người lao động hay hỏi
              </h2>
            </div>
            <div className="lg:col-span-2">
              <ul className="divide-y divide-line">
                {FAQ.map((item) => (
                  <li key={item.q} className="py-5 first:pt-0">
                    <p className="font-semibold text-primary-700 mb-1.5">{item.q}</p>
                    <p className="text-sm text-primary-500 leading-relaxed">{item.a}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs text-primary-400 leading-relaxed">
                Căn cứ:{' '}
                <span className="font-data">Luật 109/2025/QH15</span> ·{' '}
                <span className="font-data">NQ 110/2025/UBTVQH15</span> ·{' '}
                <span className="font-data">NĐ 293/2025/NĐ-CP</span> ·{' '}
                <span className="font-data">NĐ 141/2026/NĐ-CP</span>. Công cụ
                mang tính tham khảo, không thay thế tư vấn thuế chính thức.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
