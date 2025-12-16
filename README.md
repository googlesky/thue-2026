# Thuế TNCN 2026

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fthue.1devops.io&style=flat-square)](https://thue.1devops.io)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

Công cụ tính thuế thu nhập cá nhân Việt Nam - So sánh luật thuế hiện hành (7 bậc) với luật thuế mới 2026 (5 bậc).

**Live:** [https://thue.1devops.io](https://thue.1devops.io)

---

## Features

### Calculators

| Feature | Description |
|---------|-------------|
| **Tính thuế TNCN** | So sánh thuế theo 2 biểu thuế, hiển thị tiết kiệm theo tháng/năm |
| **GROSS ⇄ NET** | Chuyển đổi 2 chiều với binary search, đồng bộ với các tab khác |
| **Lương tăng ca** | Tính lương OT theo ngày thường, cuối tuần, lễ |
| **Quyết toán thuế** | Tổng hợp thu nhập năm, thưởng, tính thuế phải nộp/hoàn |
| **Thưởng Tết** | So sánh các scenario trả thưởng tối ưu thuế (T12/2025 vs T1-6/2026 vs T7+/2026) |
| **ESOP Calculator** | Tính thuế cổ phiếu ESOP/stock options với so sánh thời điểm exercise |

### Comparisons

| Feature | Description |
|---------|-------------|
| **So sánh offers** | So sánh 2-4 job offers với lương, thưởng, phụ cấp |
| **So sánh năm** | Xu hướng thuế qua các năm 2024-2026 |
| **Freelancer vs Fulltime** | So sánh thuế 10% khoán vs lũy tiến + BHXH |
| **Chi phí NTD** | Tổng chi phí doanh nghiệp (lương + BHXH DN + công đoàn) |

### Reference

| Feature | Description |
|---------|-------------|
| **Chi tiết bảo hiểm** | BHXH/BHYT/BHTN với 4 vùng lương, mức trần |
| **Thu nhập khác** | Thuế các loại thu nhập vãng lai |
| **Biểu thuế suất** | Bảng so sánh 7 bậc vs 5 bậc |
| **Lịch sử luật** | Timeline thay đổi luật thuế TNCN |

### Technical Features

- **URL Sharing**: Lưu/chia sẻ state qua URL với LZ compression
- **QR Code**: Tạo QR để scan trên mobile
- **Responsive**: Mobile-first design
- **Static Export**: Host trên GitHub Pages, CDN
- **SEO Optimized**: Open Graph, Twitter Cards, JSON-LD, sitemap

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| UI | React 19, Tailwind CSS 3.4 |
| Charts | Recharts 2.15 |
| Compression | lz-string |
| QR | qrcode.react |
| Build | Static HTML export |
| Hosting | GitHub Pages |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout với SEO metadata
│   ├── page.tsx             # Main page với 14 tabs
│   ├── robots.ts            # robots.txt generation
│   └── sitemap.ts           # sitemap.xml generation
├── components/
│   ├── AnnualSettlement/    # Quyết toán thuế năm
│   ├── BonusCalculator/     # Tính thuế thưởng Tết
│   ├── ESOPCalculator/      # Tính thuế ESOP
│   ├── FreelancerComparison/# So sánh Freelancer vs NV
│   ├── OvertimeCalculator/  # Tính lương tăng ca
│   ├── SalaryComparison/    # So sánh offers
│   ├── SaveShare/           # URL sharing + QR
│   ├── TaxLawHistory/       # Lịch sử luật thuế
│   ├── YearlyComparison/    # So sánh thuế theo năm
│   ├── ui/                  # Shared UI (Tooltip, Modal)
│   ├── GrossNetConverter.tsx
│   ├── EmployerCostCalculator.tsx
│   ├── TaxInput.tsx
│   ├── TaxResult.tsx
│   ├── TaxChart.tsx
│   └── TabNavigation.tsx
├── lib/
│   ├── taxCalculator.ts     # Core tax calculation logic
│   ├── bonusCalculator.ts   # Bonus optimization logic
│   ├── esopCalculator.ts    # ESOP tax calculation
│   ├── yearlyTaxCalculator.ts
│   ├── snapshotCodec.ts     # URL encoding/decoding
│   └── snapshotTypes.ts     # State type definitions
└── public/
    ├── icon.svg             # SVG favicon
    ├── og-image.png         # Open Graph image
    └── manifest.json        # PWA manifest
```

---

## Tax Constants

### Biểu thuế mới 2026 (5 bậc)

| Bậc | Thu nhập tính thuế | Thuế suất |
|:---:|:-------------------|:---------:|
| 1 | ≤ 10 triệu | 5% |
| 2 | 10 - 30 triệu | 10% |
| 3 | 30 - 60 triệu | 20% |
| 4 | 60 - 100 triệu | 30% |
| 5 | > 100 triệu | 35% |

### Biểu thuế hiện hành (7 bậc)

| Bậc | Thu nhập tính thuế | Thuế suất |
|:---:|:-------------------|:---------:|
| 1 | ≤ 5 triệu | 5% |
| 2 | 5 - 10 triệu | 10% |
| 3 | 10 - 18 triệu | 15% |
| 4 | 18 - 32 triệu | 20% |
| 5 | 32 - 52 triệu | 25% |
| 6 | 52 - 80 triệu | 30% |
| 7 | > 80 triệu | 35% |

### Giảm trừ gia cảnh

| Khoản | Luật hiện hành | Luật mới 2026 |
|-------|:--------------:|:-------------:|
| Bản thân | 11 triệu/tháng | 15.5 triệu/tháng |
| Người phụ thuộc | 4.4 triệu/người | 6.2 triệu/người |

### Bảo hiểm bắt buộc

| Loại | NLĐ | DN | Mức trần |
|------|:---:|:--:|----------|
| BHXH | 8% | 17.5% | 20× lương cơ sở (46.8tr) |
| BHYT | 1.5% | 3% | 20× lương cơ sở (46.8tr) |
| BHTN | 1% | 1% | 20× lương tối thiểu vùng |
| Công đoàn | - | 2% | Không giới hạn |

### Vùng lương tối thiểu (2024-2025)

| Vùng | Mức lương | Khu vực |
|:----:|----------:|---------|
| I | 4,960,000₫ | HN, HCM, Bình Dương... |
| II | 4,410,000₫ | Đà Nẵng, Hải Phòng... |
| III | 3,860,000₫ | Tỉnh lỵ, TP nhỏ |
| IV | 3,450,000₫ | Nông thôn |

---

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Quick Start

```bash
# Clone
git clone https://github.com/googlesky/thue-2026.git
cd thue-2026

# Install
npm install

# Dev server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Production build + static export to `out/` |
| `npm run lint` | Run ESLint |
| `npm start` | Start production server (not for static) |

### Generate Icons

```bash
node scripts/generate-icons.mjs
```

Generates favicon, apple-touch-icon, PWA icons, and OG image from SVG.

---

## Deployment

### GitHub Pages

The project is configured for static export. Build output goes to `out/`.

```bash
npm run build
# Deploy out/ to GitHub Pages
```

### Custom Domain

1. Add CNAME file with your domain
2. Configure DNS to point to GitHub Pages
3. Enable HTTPS in repo settings

---

## Architecture Notes

### State Management

- Centralized state in `page.tsx`
- Props drilling to child components
- `useCallback` with functional updates to avoid stale closures
- `useEffect` for prop sync to local state

### GROSS ↔ NET Conversion

- Binary search algorithm for NET → GROSS
- Separate storage for gross/net values to prevent drift
- Precision: 1,000₫, max 50 iterations

### URL State Sharing

- LZ-string compression for compact URLs
- Base64 encoding for URL safety
- Versioned codec for backward compatibility

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**1DevOps** - [https://1devops.io](https://1devops.io)
