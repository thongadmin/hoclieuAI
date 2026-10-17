# HỌC LIỆU AI - NỀN TẢNG HỌC LIỆU SỐ TƯƠNG TÁC THCS

Nền tảng giúp giáo viên tạo, biên tập, kiểm duyệt, chia sẻ và giao học liệu số tương tác; học sinh học, làm bài và nộp sản phẩm; nhà trường theo dõi hoạt động và kết quả theo Chương trình Giáo dục phổ thông 2018 (Khối 6–9).

---

## 1. Kiến trúc & Công nghệ
- **Frontend / Backend**: Next.js 14 (App Router), TypeScript, React 18.
- **Styling**: Tailwind CSS với bảng màu nhận diện giáo dục thân thiện, hỗ trợ responsive di động và phòng máy tính trường học.
- **Cơ sở dữ liệu**: PostgreSQL với Prisma ORM.
- **Xác thực & Phiên**: JSON Web Token (JWT) mã hóa ký số qua thư viện `jose`, mật khẩu băm `bcryptjs`, lưu trong HttpOnly Cookie an toàn.
- **AI Engine**: Tách Adapter qua Google GenAI SDK (`gemini-2.5-flash`), cấu hình bảo mật qua biến môi trường server-side, kiểm tra schema đầu ra.
- **Chấm điểm**: Engine chấm tự động các câu hỏi đóng (Trắc nghiệm, Đúng/Sai, Điền khuyết, Ghép đôi); phân tách rõ gợi ý AI và điểm chính thức của giáo viên đối với câu hỏi mở.

---

## 2. Hướng dẫn cài đặt & Chạy cục bộ

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Thiết lập biến môi trường
Tạo tệp `.env` dựa trên `.env.example`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hoclieu_ai?schema=public"
AUTH_SECRET="chuoi_bi_mat_jwt_ngau_nhien_it_nhat_32_ky_tu_2026"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
AI_MODEL_NAME="gemini-2.5-flash"
TZ="Asia/Ho_Chi_Minh"
```

### Bước 3: Khởi tạo Cơ sở dữ liệu & Dữ liệu mẫu (Seed)
```bash
npx prisma db push
npm run prisma:seed
```

Tài khoản mặc định được khởi tạo sau khi seed:
- **Quản trị viên**: `admin@thcsthongnhat.edu.vn` (Mật khẩu: `MatKhauChuan2026@`)
- **Giáo viên 1 (Toán)**: `gv.an@thcsthongnhat.edu.vn` (Mật khẩu: `MatKhauChuan2026@`)
- **Giáo viên 2 (KHTN)**: `gv.binh@thcsthongnhat.edu.vn` (Mật khẩu: `MatKhauChuan2026@`)
- **Học sinh Lớp 7A1**: `hs.cuong@thcsthongnhat.edu.vn` (Mật khẩu: `MatKhauChuan2026@`)

### Bước 4: Chạy kiểm thử tự động
```bash
npm test
```

### Bước 5: Khởi động máy chủ phát triển
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

---

## 3. Quy trình vận hành & Bảo mật
1. **Phân quyền Server-Side**: Mọi endpoint API đều xác thực phiên từ HttpOnly Cookie và kiểm tra vai trò (ADMIN, TEACHER, STUDENT).
2. **Khóa phiên bản bất biến khi giao bài**: Khi giáo viên giao bài cho lớp, hệ thống liên kết với `resourceVersionId` cố định, đảm bảo các sửa đổi sau này của học liệu không làm xáo trộn bài đã giao.
3. **Chống trùng lặp dữ liệu**: Sử dụng bảng `LearningEvent` với khóa `idempotencyKey` để ngăn chặn việc spam bấm hoặc gửi lại sự kiện làm sai lệch thống kê.
4. **An toàn khi xuất bảng tính**: Dữ liệu xuất sang Excel/CSV được làm sạch để chống chèn mã độc/Formula Injection (`=`, `+`, `-`, `@`).
