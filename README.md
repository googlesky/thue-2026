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

**Thuế TNCN 2026** là ứng dụng web giúp người lao động Việt Nam tính toán, so sánh và tối ưu thuế thu nhập cá nhân. Hỗ trợ các quy định của Luật Thuế TNCN số 109/2025/QH15 (sửa đổi bởi Luật số 09/2026/QH16), NĐ 253/2026/NĐ-CP và TT 87/2026/TT-BTC; biểu 5 bậc và giảm trừ gia cảnh mới áp dụng từ **kỳ tính thuế 2026** (01/01/2026) cho thu nhập từ tiền lương, tiền công.

### Điểm nổi bật

- Tính theo **biểu thuế 5 bậc** (hiện hành, từ kỳ tính thuế 2026), so sánh với **biểu 7 bậc** cũ (đến kỳ tính thuế 2025)
- Tính toán chính xác với **giảm trừ gia cảnh mới** (15,5 triệu/tháng bản thân, 6,2 triệu/tháng mỗi người phụ thuộc)
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
| **Thưởng Tết** | Tạm khấu trừ tháng nhận thưởng và thuế sau quyết toán năm |
| **ESOP Calculator** | Thuế khi bán cổ phiếu ESOP/thưởng theo NĐ 253/2026 (khấu trừ 10%, quyết toán, 0,1% chuyển nhượng) |
| **Dự tính lương hưu** | Ước tính lương hưu dựa trên số năm đóng BHXH |

### Công cụ mới 2026

| Công cụ | Mô tả | Hiệu lực |
|---------|-------|----------|
| **Thuế hộ kinh doanh** | Doanh thu đến 1 tỷ/năm không phải nộp thuế TNCN (NĐ 141/2026/NĐ-CP) | Kỳ tính thuế 2026 |
| **Thuế chuyển nhượng BĐS** | 2% TNCN + 0,5% lệ phí trước bạ | Hiện hành |
| **Kiểm tra miễn thuế** | 21 khoản miễn thuế Luật 109/2025 Điều 4, miễn 05 năm (Điều 5) và các khoản không tính vào thu nhập chịu thuế (NĐ 253/2026) | 01/07/2026 (tiền lương: kỳ 2026) |
| **Thuế cho thuê tài sản** | Doanh thu đến 1 tỷ/năm không nộp; vượt: 5% phần vượt 1 tỷ | Kỳ tính thuế 2026 |
| **Thuế chứng khoán** | 0,1% trên giá bán, cổ tức, trái phiếu | Hiện hành |
| **Thuế người nước ngoài** | Cư trú và không cư trú tại Việt Nam | Hiện hành |

### Công cụ so sánh

| Công cụ | Mô tả |
|---------|-------|
| **So sánh offers** | So sánh 2-4 job offers với lương, thưởng, phụ cấp |
| **So sánh năm** | Thuế quyết toán năm 2025 (7 bậc) và 2026 (5 bậc) |
| **Freelancer vs Fulltime** | So sánh khấu trừ 10% (từ 5 triệu/lần, quyết toán lũy tiến) với lương lũy tiến + BHXH |
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

### Biểu thuế hiện hành (5 bậc)

> Áp dụng từ **kỳ tính thuế 2026** (01/01/2026) cho thu nhập từ tiền lương, tiền công của cá nhân cư trú (Luật số 109/2025/QH15, Điều 9; NĐ 253/2026/NĐ-CP, Điều 69). Tờ khai tháng/quý 01–06/2026 đã khai theo quy định cũ không phải khai lại, chênh lệch được điều chỉnh khi quyết toán năm 2026 (NĐ 253/2026/NĐ-CP, Điều 70).

| Bậc | Thu nhập tính thuế/tháng | Thuế suất |
|:---:|--------------------------|:---------:|
| 1 | Đến 10 triệu | **5%** |
| 2 | Trên 10 - 30 triệu | **10%** |
| 3 | Trên 30 - 60 triệu | **20%** |
| 4 | Trên 60 - 100 triệu | **30%** |
| 5 | Trên 100 triệu | **35%** |

### Biểu thuế cũ (7 bậc)

> Áp dụng đến **kỳ tính thuế 2025** (31/12/2025)

| Bậc | Thu nhập tính thuế/tháng | Thuế suất |
|:---:|--------------------------|:---------:|
| 1 | Đến 5 triệu | **5%** |
| 2 | Trên 5 - 10 triệu | **10%** |
| 3 | Trên 10 - 18 triệu | **15%** |
| 4 | Trên 18 - 32 triệu | **20%** |
| 5 | Trên 32 - 52 triệu | **25%** |
| 6 | Trên 52 - 80 triệu | **30%** |
| 7 | Trên 80 triệu | **35%** |

### Giảm trừ

| Khoản giảm trừ | Đến kỳ tính thuế 2025 | Từ kỳ tính thuế 2026 |
|----------------|:---------:|:-------------:|
| Bản thân | 11 triệu/tháng | **15,5 triệu/tháng** |
| Người phụ thuộc | 4,4 triệu/người/tháng | **6,2 triệu/người/tháng** |
| Điều kiện thu nhập của người phụ thuộc | Bình quân ≤ 1 triệu/tháng | **Bình quân ≤ 3 triệu/tháng** (TT 87/2026/TT-BTC) |
| Hưu trí bổ sung, hưu trí tự nguyện, bảo hiểm nhân thọ | Hưu trí tự nguyện ≤ 1 triệu/tháng | **Tổng ≤ 3 triệu/tháng**, gồm cả phần công ty đóng |
| Chi khám chữa bệnh (danh mục BHYT chi trả) | – | **≤ 23 triệu/năm** (NNT + người phụ thuộc) |
| Chi giáo dục, đào tạo | – | **≤ 24 triệu/năm** (NNT + người phụ thuộc) |

> Giảm trừ gia cảnh 15,5/6,2 triệu: Luật 109/2025/QH15 Điều 10 (trước đó NQ 110/2025/UBTVQH15). Hưu trí, y tế, giáo dục: NĐ 253/2026/NĐ-CP Điều 46, 49; muốn trừ chi y tế, giáo dục phải có chứng từ và **tự quyết toán** (Điều 51). Từ thiện, nhân đạo: không giới hạn.

### Các mốc từ 01/07/2026

| Nội dung | Trước | Từ 01/07/2026 |
|----------|:-----:|:-------------:|
| Tiền ăn giữa ca trả bằng tiền được miễn | 730.000 đ/tháng (hướng dẫn cũ) | **≤ 1,2 triệu/người/tháng**, phần vượt chịu thuế (NĐ 253/2026 Điều 8) |
| Khấu trừ 10% thu nhập vãng lai (không HĐLĐ, HĐLĐ < 3 tháng) | Từ 2 triệu/lần | **Từ 5 triệu/lần** (NĐ 253/2026 Điều 50) |
| Ngưỡng chịu thuế từng lần: trúng thưởng, thừa kế, quà tặng, bản quyền, nhượng quyền | 10 triệu | **20 triệu** |
| Trần lương đóng BHXH, BHYT (20 × lương cơ sở) | 46,8 triệu | **50,6 triệu** (lương cơ sở 2.530.000, NĐ 161/2026/NĐ-CP) |
| Thuế 0,1% chuyển nhượng vàng miếng | – | **Chưa thu**, chờ Chính phủ quy định ngưỡng và thời điểm |

### Bảo hiểm bắt buộc

| Loại | Người lao động | Doanh nghiệp | Mức trần |
|------|:--------------:|:------------:|----------|
| BHXH | 8% | 17,5% | 20 × lương cơ sở: 46,8 triệu (đến 30/06/2026), 50,6 triệu (từ 01/07/2026) |
| BHYT | 1,5% | 3% | 20 × lương cơ sở: 46,8 triệu (đến 30/06/2026), 50,6 triệu (từ 01/07/2026) |
| BHTN | 1% | 1% | 20 × lương tối thiểu vùng |
| Công đoàn | - | 2% | Không giới hạn |

### Lương tối thiểu vùng (từ 01/01/2026 - NĐ 293/2025/NĐ-CP)

> Địa bàn chia theo xã, phường của 34 tỉnh, thành sau sắp xếp (Phụ lục NĐ 293/2025/NĐ-CP).

| Vùng | Mức lương | Khu vực áp dụng |
|:----:|----------:|-----------------|
| I | 5.310.000 ₫ | Phần lớn Hà Nội, TP.HCM, Hải Phòng; một phần Quảng Ninh, Đồng Nai, Tây Ninh, Khánh Hòa |
| II | 4.730.000 ₫ | Xã, phường Vùng II theo NĐ 293/2025 (VD: trung tâm Đà Nẵng) |
| III | 4.140.000 ₫ | Xã, phường Vùng III theo NĐ 293/2025 |
| IV | 3.700.000 ₫ | Các xã còn lại theo NĐ 293/2025 |

### Văn bản áp dụng

- Luật Thuế TNCN số 109/2025/QH15 (hiệu lực 01/07/2026; tiền lương, kinh doanh áp dụng từ kỳ tính thuế 2026), sửa đổi bởi Luật số 09/2026/QH16
- Nghị quyết 110/2025/UBTVQH15 (điều chỉnh mức giảm trừ gia cảnh; mức 15,5/6,2 triệu nay quy định tại Luật 109/2025/QH15 Điều 10)
- Nghị định 253/2026/NĐ-CP (thay NĐ 65/2013) và Thông tư 87/2026/TT-BTC (thay TT 111/2013)
- Nghị định 141/2026/NĐ-CP (ngưỡng doanh thu 1 tỷ/năm của hộ, cá nhân kinh doanh)
- Nghị định 161/2026/NĐ-CP (lương cơ sở 2.530.000 từ 01/07/2026), Nghị định 293/2025/NĐ-CP (lương tối thiểu vùng 2026)

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

- Thuật toán **binary search** cho NET → GROSS, sai số < 1 ₫, tối đa 100 vòng lặp
- Tab GROSS ⇄ NET tìm nhị phân trên chính engine tính thuế (cùng BH từng loại, phụ cấp, giảm trừ khác, hưu trí với tab Tính thuế), GROSS làm tròn đồng
- GROSS lưu ở state chung; NET giữ riêng khi nhập theo NET để tránh trôi số khi đổi chế độ

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
  <sub>Được xây dựng cho cộng đồng người lao động Việt Nam</sub>
</p>
