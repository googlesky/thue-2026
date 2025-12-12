## Mô tả dự án
Tool web tính thuế TNCN 2026 so với luật thuế cũ. Viết bằng Next.js, build static HTML để host trên GitHub Pages. Build trong Docker.

## Tính năng đã hoàn thành ✓
- [x] Tính thuế thu nhập cá nhân (so sánh luật cũ 7 bậc vs luật mới 5 bậc)
- [x] Chuyển đổi GROSS ⇄ NET
- [x] Tính bảo hiểm bắt buộc (BHXH, BHYT, BHTN) - cả phần người lao động và công ty
- [x] Hỗ trợ 4 vùng lương tối thiểu (BHTN tính theo 20x lương tối thiểu vùng)
- [x] Miễn trừ gia cảnh / Người phụ thuộc
- [x] Quỹ hưu trí tự nguyện (tối đa 1 triệu/tháng)
- [x] Đóng góp từ thiện, nhân đạo
- [x] Biểu đồ so sánh thuế cũ vs mới
- [x] Bảng biểu thuế chi tiết

## Tính năng mới thêm ✓
- [x] Tùy chọn bật/tắt từng loại bảo hiểm (BHXH 8%, BHYT 1.5%, BHTN 1%)
- [x] Tùy chọn mức lương khai báo với nhà nước (ví dụ: lương thực 70tr nhưng khai 50tr)

## Tech stack
- Next.js 15 + React 19
- TypeScript
- Tailwind CSS
- Recharts (biểu đồ)
- Docker build với Node 22
