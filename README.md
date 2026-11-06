# Sổ tay TOEIC

Trang web học TOEIC cá nhân: ôn từ vựng theo lặp lại ngắt quãng, luyện Part 5, việc hàng ngày, cấu trúc bài thi. Có đăng nhập để dùng trên mọi thiết bị.

- Không cần cài đặt hay biên dịch gì. Đây là các file HTML, CSS, JS thuần.
- Trang đăng trên **GitHub Pages**. Tài khoản và tiến độ lưu trên **Supabase**.
- Cả hai đều có gói miễn phí đủ cho một người dùng.

Làm lần lượt 5 bước dưới đây. Tên các mục trên trang web của GitHub và Supabase có thể khác đôi chút so với mô tả, nhưng ý nghĩa giống nhau.

## Thử trước trên máy (không bắt buộc)

Mở file `index.html` bằng trình duyệt. Khi chưa điền cấu hình ở bước 4, trang chạy ở chế độ chỉ lưu trên trình duyệt đó, đủ để xem giao diện và thử ôn từ.

## Bước 1. Đưa mã lên GitHub

1. Vào github.com, bấm **New repository**. Đặt tên, ví dụ `toeic-notebook`, chọn **Public**, bấm **Create repository**.
2. Bấm **uploading an existing file**, kéo toàn bộ nội dung thư mục này vào (giữ nguyên các thư mục `css`, `js`, `supabase`), rồi bấm **Commit changes**.

## Bước 2. Bật GitHub Pages

1. Trong repository, vào **Settings > Pages**.
2. Ở mục **Build and deployment**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Đợi 1 đến 2 phút. Trang hiện địa chỉ dạng `https://TEN-CUA-BAN.github.io/toeic-notebook/`. Chép địa chỉ này, bước 3 sẽ dùng.

## Bước 3. Tạo dự án Supabase

1. Vào supabase.com, bấm **Start your project**, đăng nhập bằng GitHub.
2. Bấm **New project**. Đặt tên, đặt mật khẩu cơ sở dữ liệu (cất kỹ nhưng trang này không dùng đến), chọn vùng gần bạn (ví dụ Singapore), bấm **Create new project**. Đợi vài phút.
3. Vào **SQL Editor > New query**, mở file `supabase/schema.sql`, dán toàn bộ nội dung vào, bấm **Run**. Kết quả phải báo thành công. Bước này tạo bảng lưu tiến độ và quy tắc để mỗi người chỉ thấy dữ liệu của mình.
4. Vào **Authentication > URL Configuration**:
   - **Site URL**: dán địa chỉ GitHub Pages ở bước 2.
   - **Redirect URLs**: thêm cùng địa chỉ đó.
5. Vào **Authentication > Sign In / Providers > Email** (tên có thể là **Providers**):
   - Nếu muốn đăng ký xong dùng ngay, tắt **Confirm email**.
   - Nếu để bật, mỗi tài khoản mới phải bấm liên kết trong email. Dịch vụ gửi email miễn phí có giới hạn vài email mỗi giờ.

## Bước 4. Dán khóa kết nối vào trang

1. Trong Supabase, vào **Project Settings > API** (hoặc **API Keys**).
2. Chép hai giá trị:
   - **Project URL**, dạng `https://xxxx.supabase.co`.
   - Khóa công khai: **anon public** (hoặc **publishable**).
3. Trên GitHub, mở file `js/config.js`, bấm biểu tượng bút chì để sửa, dán hai giá trị vào giữa hai dấu ngoặc kép, rồi **Commit changes**.

Hai giá trị này không phải bí mật. Dữ liệu được bảo vệ bởi các quy tắc ở bước 3. **Không bao giờ dán khóa `service_role` vào đây.**

## Bước 5. Dùng

Đợi 1 đến 2 phút để GitHub Pages cập nhật, mở địa chỉ trang, bấm **Tạo tài khoản**, nhập email và mật khẩu. Từ giờ đăng nhập trên máy nào cũng thấy cùng một tiến độ. Góc trên cùng hiện trạng thái: **Đã đồng bộ**, **Đang lưu…** hoặc **Đang ngoại tuyến**.

## Lưu ý

- Dự án Supabase miễn phí có thể bị tạm dừng nếu khoảng một tuần không có hoạt động. Khi đó vào bảng điều khiển Supabase và bấm khôi phục. Dữ liệu không mất.
- Tiến độ cũng được lưu trên máy bạn, nên mất mạng vẫn học được và sẽ đồng bộ khi có mạng lại.
- Nếu hai thiết bị sửa cùng lúc, bản sửa sau cùng thắng.
- Thư viện đăng nhập được nạp từ `cdn.jsdelivr.net`, ghim một phiên bản trong `index.html`. Muốn nâng cấp thì đổi số phiên bản ở dòng `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@...">`.

## Cấu trúc thư mục

```
index.html          Trang chính
css/style.css       Giao diện
js/config.js        Khóa kết nối Supabase (bạn điền)
js/data.js          Từ vựng, câu Part 5, việc hàng ngày, bảng cấu trúc
js/srs.js           Thuật toán lặp lại ngắt quãng
js/store.js         Lưu trên máy và đồng bộ lên Supabase
js/app.js           Giao diện và đăng nhập
supabase/schema.sql Bảng dữ liệu và quy tắc bảo mật
```
