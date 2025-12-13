## Mô tả dự án

Tool web tính thuế TNCN Việt Nam 2026 - so sánh luật thuế mới (5 bậc) với luật thuế cũ (7 bậc). Viết bằng Next.js, build static HTML để host trên GitHub Pages.

**Website:** https://thue.1devops.io

## Tính năng

### Tính thuế TNCN
- [x] So sánh luật cũ (7 bậc) vs luật mới 2026 (5 bậc)
- [x] Hiển thị tiết kiệm thuế theo tháng và năm
- [x] Miễn trừ gia cảnh / Người phụ thuộc
- [x] Quỹ hưu trí tự nguyện (tối đa 1 triệu/tháng)
- [x] Đóng góp từ thiện, nhân đạo

### Chuyển đổi GROSS ⇄ NET
- [x] Chuyển đổi 2 chiều GROSS → NET và NET → GROSS
- [x] Lưu riêng giá trị GROSS và NET, không bị drift khi chuyển mode
- [x] Đồng bộ dữ liệu với tab Tính thuế

### Chi phí Nhà tuyển dụng (Mới)
- [x] Tính tổng chi phí DN phải trả (lương + bảo hiểm phần DN)
- [x] BHXH 17.5%, BHYT 3%, BHTN 1% phần doanh nghiệp
- [x] Tùy chọn phí công đoàn 2%
- [x] Hiển thị tỷ lệ chi phí/lương và thống kê năm
- [x] So sánh góc nhìn DN vs NLĐ

### So sánh Freelancer vs Nhân viên (Mới)
- [x] So sánh thu nhập thực nhận giữa 2 hình thức
- [x] Freelancer: thuế khấu trừ 10% (phương pháp khoán)
- [x] Nhân viên: thuế lũy tiến + giảm trừ gia cảnh + BHXH
- [x] Tính điểm hòa vốn (break-even point)
- [x] Phân tích ưu/nhược điểm chi tiết từng hình thức
- [x] Cảnh báo: freelancer phải tự mua BHYT, không có lương hưu

### So sánh lương giữa các công ty (Mới)
- [x] So sánh 2-4 offers từ các công ty khác nhau
- [x] Tính toán bao gồm thưởng tháng 13, 14
- [x] Phụ cấp hàng tháng (giả định không chịu thuế)
- [x] Biểu đồ so sánh trực quan
- [x] Highlight offer tốt nhất theo NET năm

### So sánh thuế theo năm (Mới)
- [x] So sánh thuế phải đóng qua các năm
- [x] Hiển thị xu hướng thay đổi

### Bảo hiểm bắt buộc
- [x] Tùy chọn bật/tắt từng loại: BHXH (8%), BHYT (1.5%), BHTN (1%)
- [x] Tính phần người lao động đóng và phần công ty đóng
- [x] Hỗ trợ 4 vùng lương tối thiểu
- [x] BHXH/BHYT: tối đa 20x lương cơ sở (46.8 triệu)
- [x] BHTN: tối đa 20x lương tối thiểu vùng

### Lương khai báo
- [x] Tùy chọn mức lương khai báo khác lương thực tế
- [x] Thuế và bảo hiểm tính trên lương khai báo

### Biểu đồ & Bảng biểu
- [x] Biểu đồ so sánh thuế cũ vs mới theo mức thu nhập
- [x] Bảng biểu thuế chi tiết 7 bậc và 5 bậc

### Đồng bộ dữ liệu
- [x] Liên thông giữa các tab (Tính thuế ↔ GROSS-NET ↔ Bảo hiểm ↔ Freelancer ↔ So sánh lương)
- [x] SharedTaxState quản lý state tập trung
- [x] Tránh vòng lặp vô hạn với useRef (isLocalChange)

## Các hằng số quan trọng

### Biểu thuế mới 2026 (5 bậc)
| Bậc | Thu nhập tính thuế | Thuế suất |
|-----|-------------------|-----------|
| 1   | Đến 10 triệu      | 5%        |
| 2   | 10-30 triệu       | 10%       |
| 3   | 30-60 triệu       | 20%       |
| 4   | 60-100 triệu      | 30%       |
| 5   | Trên 100 triệu    | 35%       |

### Biểu thuế hiện hành (7 bậc)
| Bậc | Thu nhập tính thuế | Thuế suất |
|-----|-------------------|-----------|
| 1   | Đến 5 triệu       | 5%        |
| 2   | 5-10 triệu        | 10%       |
| 3   | 10-18 triệu       | 15%       |
| 4   | 18-32 triệu       | 20%       |
| 5   | 32-52 triệu       | 25%       |
| 6   | 52-80 triệu       | 30%       |
| 7   | Trên 80 triệu     | 35%       |

### Giảm trừ gia cảnh
| Khoản | Luật hiện hành | Luật mới 2026 |
|-------|----------------|---------------|
| Bản thân | 11 triệu/tháng | 15.5 triệu/tháng |
| Người phụ thuộc | 4.4 triệu/người/tháng | 6.2 triệu/người/tháng |

### Vùng lương tối thiểu 2024-2025
| Vùng | Mức lương     | Khu vực                    |
|------|---------------|----------------------------|
| I    | 4,960,000 VNĐ | Hà Nội, HCM, Bình Dương... |
| II   | 4,410,000 VNĐ | Đà Nẵng, Hải Phòng...      |
| III  | 3,860,000 VNĐ | Tỉnh lỵ, thành phố nhỏ     |
| IV   | 3,450,000 VNĐ | Nông thôn                  |

### Bảo hiểm bắt buộc
| Loại | Người lao động | Doanh nghiệp | Mức trần |
|------|----------------|--------------|----------|
| BHXH | 8% | 17.5% | 20x lương cơ sở (46.8 triệu) |
| BHYT | 1.5% | 3% | 20x lương cơ sở (46.8 triệu) |
| BHTN | 1% | 1% | 20x lương tối thiểu vùng |
| Công đoàn | - | 2% | Không giới hạn |

### Thuế thu nhập vãng lai (Freelancer)
- Thuế suất: 10% trên tổng thu nhập (phương pháp khoán)
- Không được giảm trừ gia cảnh
- Không được trừ bảo hiểm

## Cấu trúc dự án

```
src/
├── app/
│   └── page.tsx              # Trang chính với 9 tabs
├── components/
│   ├── TaxCalculator.tsx     # Tính thuế TNCN
│   ├── GrossNetConverter.tsx # Chuyển đổi GROSS-NET
│   ├── EmployerCostCalculator.tsx # Chi phí NTD
│   ├── FreelancerComparison/ # So sánh Freelancer vs NV
│   ├── SalaryComparison/     # So sánh lương các công ty
│   ├── YearlyTaxComparison.tsx
│   ├── InsuranceCalculator.tsx
│   ├── OtherIncomeCalculator.tsx
│   └── TaxTable.tsx
└── lib/
    ├── taxCalculator.ts      # Logic tính thuế chính
    ├── freelancerCalculator.ts # Logic freelancer
    ├── salaryComparisonCalculator.ts # Logic so sánh lương
    └── constants.ts          # Hằng số thuế, bảo hiểm
```

## Lưu ý kỹ thuật

### Tránh value drift trong GROSS-NET
- Lưu riêng `grossValue` và `netValue`
- Khi chuyển mode chỉ đổi display, không recalculate
- Chỉ tính toán khi user thay đổi input

### Đồng bộ giữa các tab
- Sử dụng `SharedTaxState` lifted lên page.tsx
- `isLocalChange` ref để tránh vòng lặp sync
- Callback `onStateChange` để notify parent

### Binary search cho NET → GROSS
- Độ chính xác 1000 VNĐ
- Max 50 iterations
- Tránh recalculate liên tục gây drift

### Input validation
- Tất cả giá trị đầu vào được validate không âm
- Bonus months giới hạn tối đa 12 tháng
- Graceful handling cho edge cases

## Phát triển

```bash
# Cài dependencies
npm install

# Chạy dev server
npm run dev

# Build production
npm run build

# Export static HTML
npm run export
```

## License

MIT
