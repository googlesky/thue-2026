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
- [x] Liên thông giữa các tab (Tính thuế ↔ GROSS-NET ↔ Bảo hiểm)
- [x] SharedTaxState quản lý state tập trung
- [x] Tránh vòng lặp vô hạn với useRef (isLocalChange)

## Các hằng số quan trọng

### Biểu thuế mới 2026 (5 bậc)
| Bậc | Thu nhập tính thuế | Thuế suất |
|-----|-------------------|-----------|
| 1   | Đến 10 triệu      | 5%        |
| 2   | 10-20 triệu       | 10%       |
| 3   | 20-40 triệu       | 15%       |
| 4   | 40-80 triệu       | 20%       |
| 5   | Trên 80 triệu     | 25%       |

### Giảm trừ gia cảnh (Luật mới)
- Bản thân: 18 triệu/tháng
- Người phụ thuộc: 8 triệu/người/tháng

### Vùng lương tối thiểu 2025
| Vùng | Mức lương     | Khu vực                    |
|------|---------------|----------------------------|
| I    | 4,960,000 VNĐ | Hà Nội, HCM, Bình Dương... |
| II   | 4,410,000 VNĐ | Đà Nẵng, Hải Phòng...      |
| III  | 3,860,000 VNĐ | Tỉnh lỵ, thành phố nhỏ     |
| IV   | 3,450,000 VNĐ | Nông thôn                  |

### Bảo hiểm bắt buộc
- BHXH: 8% (NLD) + 17.5% (Cty) - tối đa 20x lương cơ sở
- BHYT: 1.5% (NLD) + 3% (Cty) - tối đa 20x lương cơ sở
- BHTN: 1% (NLD) + 1% (Cty) - tối đa 20x lương tối thiểu vùng

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
