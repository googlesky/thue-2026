<p align="center">
  <img src="public/icon.svg" alt="Thuế TNCN 2026" width="120" height="120">
</p>

<h1 align="center">Thuế TNCN 2026</h1>

<p align="center">
  <strong>Công cụ tính thuế thu nhập cá nhân Việt Nam toàn diện nhất</strong>
</p>

<p align="center">
  <a href="https://thue.1devops.io">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fthue.1devops.io&style=for-the-badge&label=WEBSITE&labelColor=1a1a2e&color=16a34a" alt="Website">
  </a>
  <a href="https://github.com/googlesky/thue-2026/releases">
    <img src="https://img.shields.io/github/v/release/googlesky/thue-2026?style=for-the-badge&labelColor=1a1a2e&color=3b82f6" alt="Release">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/LICENSE-MIT-green?style=for-the-badge&labelColor=1a1a2e&color=8b5cf6" alt="License">
  </a>
</p>

<p align="center">
  <a href="https://nextjs.org/">
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript" alt="TypeScript">
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React">
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind">
  </a>
</p>

---

## Giới thiệu

**Thuế TNCN 2026** là ứng dụng web giúp người lao động Việt Nam tính toán, so sánh và tối ưu thuế thu nhập cá nhân. Hỗ trợ đầy đủ các quy định mới của Luật thuế TNCN sửa đổi (Luật số 109/2025/QH15), áp dụng từ **01/01/2026** cho thu nhập từ tiền lương, tiền công.

### Điểm nổi bật

- So sánh **biểu thuế 7 bậc** (hiện hành) với **biểu thuế 5 bậc** (mới 2026)
- Tính toán chính xác với **giảm trừ gia cảnh mới** (15.5 triệu/người)
- **20+ công cụ** tính thuế chuyên biệt cho mọi loại thu nhập
- Giao diện **responsive**, tối ưu cho cả desktop và mobile
- Chia sẻ kết quả qua **URL** hoặc **QR code**

---

## Tính năng

### Công cụ tính toán

| Công cụ | Mô tả |
|---------|-------|
| **Tính thuế TNCN** | So sánh thuế theo 2 biểu thuế, hiển thị số tiền tiết kiệm |
| **GROSS ⇄ NET** | Quy đổi lương 2 chiều với thuật toán binary search |
| **Lương tăng ca** | Tính OT theo ngày thường (150%), cuối tuần (200%), lễ (300%) |
| **Quyết toán thuế** | Tổng hợp thu nhập cả năm, tính thuế phải nộp hoặc hoàn |
| **Thưởng Tết** | So sánh các kịch bản trả thưởng tối ưu thuế |
| **ESOP Calculator** | Tính thuế cổ phiếu thưởng với so sánh thời điểm exercise |
| **Dự tính lương hưu** | Ước tính lương hưu dựa trên số năm đóng BHXH |

### Công cụ mới 2026

| Công cụ | Mô tả | Hiệu lực |
|---------|-------|----------|
| **Thuế hộ kinh doanh** | Ngưỡng doanh thu mới 500 triệu/năm | 01/01/2026 |
| **Thuế chuyển nhượng BĐS** | 2% TNCN + 0.5% lệ phí trước bạ | Hiện hành |
| **Kiểm tra miễn thuế** | 21 khoản miễn thuế (16 gốc + 5 mới) | 01/07/2026 |
| **Thuế cho thuê tài sản** | Thuế thu nhập thụ động từ BĐS | Hiện hành |
| **Thuế chứng khoán** | 0.1% trên giá bán, cổ tức, trái phiếu | Hiện hành |
| **Thuế người nước ngoài** | Cư trú và không cư trú tại Việt Nam | Hiện hành |

### Công cụ so sánh

| Công cụ | Mô tả |
|---------|-------|
| **So sánh offers** | So sánh 2-4 job offers với lương, thưởng, phụ cấp |
| **So sánh năm** | Xu hướng thuế qua các năm 2024-2026 |
| **Freelancer vs Fulltime** | So sánh thuế 10% khoán vs lũy tiến + BHXH |
| **Chi phí NTD** | Tổng chi phí doanh nghiệp khi tuyển nhân viên |

### Công cụ tra cứu

| Công cụ | Mô tả |
|---------|-------|
| **Chi tiết bảo hiểm** | BHXH/BHYT/BHTN với 4 vùng lương và mức trần |
| **Thu nhập khác** | Thuế các loại thu nhập vãng lai |
| **Biểu thuế suất** | Bảng so sánh 7 bậc vs 5 bậc |
| **Lịch sử luật** | Timeline thay đổi luật thuế TNCN |
| **Lịch thuế** | Các mốc thời gian quan trọng trong năm |
| **Phiếu lương** | Tạo phiếu lương PDF chuyên nghiệp |

### Tính năng kỹ thuật

- **Chia sẻ URL** - Lưu và chia sẻ kết quả với LZ compression
- **QR Code** - Tạo mã QR để scan trên mobile
- **Xuất PDF** - Tạo báo cáo PDF chuyên nghiệp
- **Responsive** - Tối ưu cho mọi kích thước màn hình
- **SEO** - Open Graph, Twitter Cards, JSON-LD, Sitemap

---

## Biểu thuế TNCN

### Biểu thuế mới 2026 (5 bậc)

> Áp dụng từ **01/01/2026** cho thu nhập từ tiền lương, tiền công theo Luật số 109/2025/QH15

| Bậc | Thu nhập tính thuế/tháng | Thuế suất |
|:---:|--------------------------|:---------:|
| 1 | Đến 10 triệu | **5%** |
| 2 | Trên 10 - 30 triệu | **10%** |
| 3 | Trên 30 - 60 triệu | **20%** |
| 4 | Trên 60 - 100 triệu | **30%** |
| 5 | Trên 100 triệu | **35%** |

### Biểu thuế hiện hành (7 bậc)

> Áp dụng đến **31/12/2025**

| Bậc | Thu nhập tính thuế/tháng | Thuế suất |
|:---:|--------------------------|:---------:|
| 1 | Đến 5 triệu | **5%** |
| 2 | Trên 5 - 10 triệu | **10%** |
| 3 | Trên 10 - 18 triệu | **15%** |
| 4 | Trên 18 - 32 triệu | **20%** |
| 5 | Trên 32 - 52 triệu | **25%** |
| 6 | Trên 52 - 80 triệu | **30%** |
| 7 | Trên 80 triệu | **35%** |

### Giảm trừ gia cảnh

| Khoản giảm trừ | Đến 31/12/2025 | Từ 01/01/2026 |
|----------------|:---------:|:-------------:|
| Bản thân | 11 triệu/tháng | **15.5 triệu/tháng** |
| Người phụ thuộc | 4.4 triệu/người | **6.2 triệu/người** |

### Bảo hiểm bắt buộc

| Loại | Người lao động | Doanh nghiệp | Mức trần |
|------|:--------------:|:------------:|----------|
| BHXH | 8% | 17.5% | 20× lương cơ sở (46.8 triệu) |
| BHYT | 1.5% | 3% | 20× lương cơ sở (46.8 triệu) |
| BHTN | 1% | 1% | 20× lương tối thiểu vùng |
| Công đoàn | - | 2% | Không giới hạn |

### Lương tối thiểu vùng (từ 01/01/2026 - NĐ 293/2025)

| Vùng | Mức lương | Khu vực áp dụng |
|:----:|----------:|-----------------|
| I | 5,310,000₫ | Hà Nội, TP.HCM, Bình Dương, Đồng Nai... |
| II | 4,730,000₫ | Đà Nẵng, Hải Phòng, Cần Thơ... |
| III | 4,140,000₫ | Tỉnh lỵ, thành phố trực thuộc tỉnh |
| IV | 3,700,000₫ | Các huyện còn lại |

---

## Cài đặt

### Yêu cầu

- Node.js 18 trở lên
- npm, pnpm hoặc yarn

### Khởi động nhanh

```bash
# Clone repository
git clone https://github.com/googlesky/thue-2026.git
cd thue-2026

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

### Các lệnh có sẵn

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server tại localhost:3000 |
| `npm run build` | Build production + static export |
| `npm run lint` | Kiểm tra code với ESLint |
| `npm run start` | Chạy production server |

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Ngôn ngữ | TypeScript 5.9 |
| UI Library | React 19 |
| Styling | Tailwind CSS 3.4 |
| Biểu đồ | Recharts 2.15 |
| Nén dữ liệu | lz-string |
| QR Code | qrcode.react |
| Hosting | GitHub Pages (Static Export) |

---

## Cấu trúc dự án

```
src/
├── app/
│   ├── layout.tsx              # Root layout với SEO metadata
│   ├── page.tsx                # Trang chủ
│   ├── tinh-thue/
│   │   └── page.tsx            # Trang tính thuế với 20+ tabs
│   ├── robots.ts               # Robots.txt
│   └── sitemap.ts              # Sitemap.xml
├── components/
│   ├── AnnualSettlement/       # Quyết toán thuế năm
│   ├── BonusCalculator/        # Tính thuế thưởng Tết
│   ├── ESOPCalculator/         # Tính thuế ESOP
│   ├── ForeignerTaxCalculator/ # Thuế người nước ngoài
│   ├── HouseholdBusinessTaxCalculator/# Thuế hộ kinh doanh
│   ├── RealEstateTransferTaxCalculator/ # Thuế BĐS
│   ├── RentalIncomeTaxCalculator/     # Thuế cho thuê
│   ├── SecuritiesTaxCalculator/       # Thuế chứng khoán
│   ├── TaxExemptionChecker/           # Kiểm tra miễn thuế
│   ├── FreelancerComparison/   # So sánh Freelancer
│   ├── OvertimeCalculator/     # Lương tăng ca
│   ├── PensionCalculator/      # Dự tính lương hưu
│   ├── SalaryComparison/       # So sánh offers
│   ├── SalarySlip/             # Phiếu lương
│   ├── TaxCalendar/            # Lịch thuế
│   ├── TaxLawHistory/          # Lịch sử luật
│   ├── TaxOptimizationTips/    # Mẹo tối ưu thuế
│   ├── YearlyComparison/       # So sánh năm
│   ├── PDFExport/              # Xuất PDF
│   ├── SaveShare/              # Chia sẻ URL + QR
│   └── TabNavigation.tsx       # Điều hướng tabs
└── lib/
    ├── taxCalculator.ts        # Logic tính thuế chính
    ├── bonusCalculator.ts      # Tính thuế thưởng
    ├── esopCalculator.ts       # Tính thuế ESOP
    ├── foreignerTaxCalculator.ts
    ├── householdBusinessTaxCalculator.ts
    ├── realEstateTransferTaxCalculator.ts
    ├── rentalIncomeTaxCalculator.ts
    ├── securitiesTaxCalculator.ts
    ├── taxExemptionChecker.ts
    ├── yearlyTaxCalculator.ts
    ├── snapshotCodec.ts        # Mã hóa URL
    └── snapshotTypes.ts        # Type definitions
```

---

## Kiến trúc

### Quản lý State

- State tập trung tại `page.tsx`
- Props drilling xuống các components con
- `useCallback` với functional updates để tránh stale closures
- `useEffect` để đồng bộ props với local state

### Quy đổi GROSS ↔ NET

- Thuật toán **binary search** cho NET → GROSS
- Lưu trữ riêng gross/net để tránh sai số tích lũy
- Độ chính xác: 1,000₫, tối đa 50 vòng lặp

### Chia sẻ qua URL

- Nén dữ liệu với **lz-string**
- Mã hóa **Base64** cho URL an toàn
- Codec có version để tương thích ngược

---

## Triển khai

### GitHub Pages

Dự án được cấu hình sẵn cho static export:

```bash
# Build
npm run build

# Output tại thư mục out/
# Deploy out/ lên GitHub Pages
```

### Tên miền tùy chỉnh

1. Tạo file `CNAME` với tên miền của bạn
2. Cấu hình DNS trỏ về GitHub Pages
3. Bật HTTPS trong settings của repository

---

## Đóng góp

Mọi đóng góp đều được hoan nghênh!

1. Fork repository
2. Tạo branch mới (`git checkout -b feat/tinh-nang-moi`)
3. Commit thay đổi (`git commit -m 'feat(scope): mô tả thay đổi'`)
4. Push lên branch (`git push origin feat/tinh-nang-moi`)
5. Tạo Pull Request

### Quy ước Commit

Dự án sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): mô tả ngắn gọn

Types: feat, fix, refactor, style, docs, chore, perf, test
Scopes: tax, ui, mobile, i18n, tools, core, pdf, a11y
```

---

## Giấy phép

Phát hành theo giấy phép **MIT** - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## Tác giả

<p align="center">
  <strong>1DevOps</strong>
  <br>
  <a href="https://1devops.io">https://1devops.io</a>
</p>

---

<p align="center">
  <sub>Được xây dựng với ❤️ cho cộng đồng người lao động Việt Nam</sub>
</p>
