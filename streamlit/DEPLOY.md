# Chạy Học liệu AI trên Streamlit Cloud

## Cấu hình chính xác
- Repository: `thongadmin/hoclieuAI`
- Branch: `main`
- Main file path: `streamlit/streamlit_app.py`
- Python: 3.12
- Chọn chế độ giới hạn người xem trong Streamlit trong lúc thiết lập. Không chia sẻ công khai trước khi kiểm tra tài khoản và dữ liệu.

Đây là bản Python riêng trong thư mục `streamlit/`. Mã Next.js ở các thư mục cũ không được thay thế và không được dùng làm entrypoint Streamlit.

## Database và Secrets
Dùng PostgreSQL (ví dụ Supabase → Connect → Session pooler). Lưu các giá trị dưới đây trong Streamlit → Advanced settings / Settings → Secrets, tuyệt đối không commit giá trị thật lên GitHub:

```toml
DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "THAY_BANG_MAT_KHAU_RIENG_IT_NHAT_12_KY_TU"
```

Dùng đúng username, host và port mà nhà cung cấp database trả về. Mật khẩu có ký tự đặc biệt phải mã hóa phần password theo URL. ADMIN_EMAIL cũng được hỗ trợ thay ADMIN_USERNAME để tương thích cấu hình trước đây.

Ứng dụng tạo các bảng mới với tiền tố `hl3_` khi kết nối thành công. Không đổi tên/xóa các bảng của ứng dụng cũ. Tài khoản quản trị ban đầu được tạo từ Secrets khi chưa có quản trị viên nào. Các lần khởi động sau không đặt lại mật khẩu hiện có. Đổi mật khẩu bên trong ứng dụng.

Nếu chưa cấu hình Secrets, ứng dụng chỉ hiển thị trang thiết lập; không có tài khoản/mật khẩu mặc định và không lưu tạm vào SQLite trên cloud.

## Đăng ký và duyệt
1. Quản trị đăng nhập bằng thông tin thiết lập.
2. Giáo viên/học sinh đăng ký tên tài khoản, mật khẩu và thông tin lớp/môn.
3. Tài khoản mới đăng nhập chỉ xem trạng thái và gửi lại hồ sơ.
4. Quản trị mở Duyệt thành viên → Chờ duyệt → Duyệt/Từ chối.
5. Tài khoản đã duyệt có menu tương ứng vai trò. Khóa tài khoản thu hồi truy cập ở lần tương tác tiếp theo. Đặt lại mật khẩu làm phiên cũ hết hiệu lực.

## Dữ liệu và tệp học liệu
Bài học, hoạt động, tài khoản, đăng ký, câu trả lời, lượt mở và kết quả đều lưu trong PostgreSQL. Ảnh, âm thanh, video, PDF, Office và HTML được lưu dưới dạng byte trong bảng `hl3_files`; tối đa 20 MB mỗi tệp. Phiên bản này không cần R2 hay Supabase Storage; theo dõi hạn mức dung lượng database khi sử dụng tệp lớn. Xem xét chuyển media sang object storage khi kho học liệu tăng.

Bài học gồm 5 hoạt động mẫu, có thể thêm/bớt hoặc đổi cấu trúc bằng JSON. Có 12 kiểu học liệu và tệp tải lên. Tệp HTML được nhúng qua iframe cách ly, chặn truy cập mạng. Các tệp phụ ngoài HTML cần được nhúng vào HTML trước khi tải lên. Word/PowerPoint/Excel/PDF tải về để mở bằng ứng dụng phù hợp.

Chấm tự động: trắc nghiệm một đáp án, đúng/sai, điền khuyết. Các loại khác lưu câu trả lời để giáo viên đọc, chưa có quy trình cho điểm tự luận. Bảng kết quả hiện hiển thị điểm; chưa có màn hình chấm tự luận. Điểm là luyện tập, không phải hệ thống thi có giám sát. Điểm HTML tải lên chưa tự liên thông.

Giao bài lọc theo tên lớp khai báo. Đây là cơ chế phân phối bài, chưa phải bảo mật từng lớp: học sinh đã duyệt vẫn có thể xem toàn bộ bài đã xuất bản trong kho chung.

Thống kê lấy từ dữ liệu thực, không tự tạo lượt học giả. Tài khoản quản trị có thể được thống kê cùng giáo viên ở các bảng tác giả; học sinh được lọc theo vai trò học sinh.

Website soạn prompt và mở Gemini; không kết nối API AI. Không cần GEMINI_API_KEY.

## Triển khai
Mở https://share.streamlit.io/ → Create app → Yup, I have an app → nhập repository, branch và main file path ở trên → Advanced settings → chọn Python 3.12 và thêm Secrets → Save → Deploy. Thiết lập quyền xem theo yêu cầu của nhà trường.

## Kiểm tra
```sh
python -m pip install -r streamlit/requirements.txt
python -m unittest discover -s streamlit -p 'test_*.py' -v
python -m streamlit run streamlit/streamlit_app.py
```

Kiểm thử sử dụng SQLite trong thư mục tạm và dữ liệu giả. ALLOW_SQLITE_DEMO chỉ dành cho kiểm thử/local có chủ ý; không bật trên cloud vì ổ đĩa Streamlit không phải kho lưu trữ bền vững. Chưa kiểm thử với PostgreSQL do chưa có kết nối database của chủ sở hữu.
