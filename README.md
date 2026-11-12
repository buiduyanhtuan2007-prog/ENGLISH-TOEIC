# Sổ tay từ vựng

Trang web học từ vựng tiếng Anh cá nhân, chỉ học từ vựng. Có hai kho từ: **bộ TOEIC** (1259 từ, xếp theo mức độ) và **Từ của tôi** (từ bạn tự thêm). Có đăng nhập để tiến độ đồng bộ trên mọi thiết bị.

- Không cần cài đặt hay biên dịch gì. Đây là các file HTML, CSS, JS thuần.
- Trang đăng trên **GitHub Pages**. Tài khoản và tiến độ lưu trên **Supabase**.
- Cả hai đều có gói miễn phí đủ cho một người dùng.

## Trang có gì

**Việc hàng ngày và chuỗi ngày (kiểu Duolingo)**
- Hai việc tự đánh dấu: ôn hết thẻ đến hạn, và học đủ số từ mới trong ngày (đặt trong Cài đặt). Xong cả hai thì ngày đó tính là hoàn thành và chuỗi tăng. Bỏ lỡ một ngày thì chuỗi về 0, trang báo "nguy cơ mất chuỗi" khi hôm nay còn thiếu.
- Xong việc rồi vẫn học thêm không giới hạn ở tab **Học thêm** (5 cách: từ mới thêm, ôn trước hạn, từ hay quên, luyện nghe, ôn tự do ngẫu nhiên).

**Ôn tập**
- Lặp lại ngắt quãng bằng thuật toán FSRS-6, đặt tỉ lệ nhớ mong muốn trong Cài đặt (mặc định 90%).
- Hai chiều cho mỗi từ: nhìn từ đoán nghĩa, rồi nhìn nghĩa gõ lại từ (mở khóa sau khi nhớ ổn chiều đầu).
- Nhiều dạng bài: thẻ lật, trắc nghiệm hai chiều, điền chỗ trống trong câu, gõ từ. Ở chế độ Tự động, từ càng nhớ chắc thì bài càng khó.
- Từ hay quên (quên từ 4 lần trở lên) được gom lại để luyện riêng, kèm gợi ý ghi mẹo nhớ.
- Ghi chú gợi nhớ, tự sửa nghĩa, và tự viết câu ví dụ riêng cho từng từ.

**Nghe và phát âm**
- Nút loa trên thẻ, kết quả bài, danh sách từ và câu ví dụ, có giọng chậm.
- Bài nghe: nghe chọn nghĩa, nghe gõ từ, nghe câu rồi điền từ còn thiếu.
- Dùng giọng đọc có sẵn của trình duyệt, nên chất lượng tùy thiết bị. Chọn giọng Mỹ hoặc Anh và tốc độ trong Cài đặt. Thiết bị không có giọng tiếng Anh thì các bài nghe tự tắt.

**Bộ TOEIC**
- 1259 từ chia 5 mức (rất thường gặp, thường gặp, trung bình, ít gặp, hiếm gặp), mỗi mức chia thành các bài 25 từ. Có thể chọn bắt đầu học từ mức nào.
- Xem theo 12 chủ đề (văn phòng, nhân sự, tài chính, mua sắm, du lịch, sản xuất, hợp đồng, tiếp thị, họp, ăn uống và khách sạn, sức khỏe, từ chung) và luyện theo chủ đề.
- Mỗi từ có nghĩa, ví dụ, họ từ (ví dụ refund, refundable) và cụm hay đi kèm.

**Từ của tôi**
- Thêm từng từ, hoặc dán nhiều từ một lúc (mỗi dòng `từ = nghĩa`, hoặc đầy đủ `từ | loại từ | nghĩa | ví dụ`).
- **Đọc văn bản**: dán một đoạn tiếng Anh bất kỳ (bài báo, bản tin), bấm vào từ để xem nghĩa. Từ thuộc bộ TOEIC hiện nghĩa có sẵn, từ chưa có thì nhập nghĩa và câu gốc được lưu làm ví dụ.
- Từ của bạn được ưu tiên chen vào mục từ mới, nhưng chiếm tối đa một nửa số từ mới mỗi ngày.

**Thống kê**: số lượt ôn và tỉ lệ nhớ 14 ngày gần nhất, dự báo số thẻ đến hạn 7 ngày tới.

## Thử trước trên máy (không bắt buộc)

Mở file `index.html` bằng trình duyệt. Khi chưa điền cấu hình ở bước 4, trang chạy ở chế độ chỉ lưu trên trình duyệt đó, đủ để xem giao diện và thử học.

## Cài mới

### Bước 1. Đưa mã lên GitHub

1. Vào github.com, bấm **New repository**. Đặt tên, ví dụ `toeic-notebook`, chọn **Public**, bấm **Create repository**.
2. Bấm **uploading an existing file**, kéo toàn bộ nội dung thư mục này vào (giữ nguyên các thư mục `css`, `js`, `supabase`, `tests`), rồi bấm **Commit changes**.

### Bước 2. Bật GitHub Pages

1. Trong repository, vào **Settings > Pages**.
2. Ở mục **Build and deployment**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Đợi 1 đến 2 phút. Trang hiện địa chỉ dạng `https://TEN-CUA-BAN.github.io/toeic-notebook/`. Chép địa chỉ này, bước 3 sẽ dùng.

### Bước 3. Tạo dự án Supabase

1. Vào supabase.com, bấm **Start your project**, đăng nhập bằng GitHub.
2. Bấm **New project**. Đặt tên, đặt mật khẩu cơ sở dữ liệu (cất kỹ nhưng trang này không dùng đến), chọn vùng gần bạn (ví dụ Singapore), bấm **Create new project**. Đợi vài phút.
3. Vào **SQL Editor > New query**, mở file `supabase/schema.sql`, dán toàn bộ nội dung vào, bấm **Run**. Kết quả phải báo thành công. Bước này tạo bảng lưu tiến độ và quy tắc để mỗi người chỉ thấy dữ liệu của mình.
4. Vào **Authentication > URL Configuration**:
   - **Site URL**: dán địa chỉ GitHub Pages ở bước 2.
   - **Redirect URLs**: thêm cùng địa chỉ đó.
5. Vào **Authentication > Sign In / Providers > Email**:
   - Nếu muốn đăng ký xong dùng ngay, tắt **Confirm email**.
   - Nếu để bật, mỗi tài khoản mới phải bấm liên kết trong email. Dịch vụ gửi email miễn phí có giới hạn vài email mỗi giờ.

### Bước 4. Dán khóa kết nối vào trang

1. Trong Supabase, vào **Project Settings > API** (hoặc **API Keys**).
2. Chép hai giá trị:
   - **Project URL**, dạng `https://xxxx.supabase.co`.
   - Khóa công khai: mục **Publishable key**, dòng `default`. Khóa bắt đầu bằng `sb_publishable_`. Không chép khóa ở mục **Secret keys**.
3. Trên GitHub, mở file `js/config.js`, bấm biểu tượng bút chì để sửa, dán hai giá trị vào giữa hai dấu ngoặc kép, rồi **Commit changes**.

Hai giá trị này không phải bí mật. Dữ liệu được bảo vệ bởi các quy tắc ở bước 3. **Không bao giờ dán khóa `service_role` vào đây.**

### Bước 5. Dùng

Đợi 1 đến 2 phút để GitHub Pages cập nhật, mở địa chỉ trang, bấm **Tạo tài khoản**, nhập email và mật khẩu. Từ giờ đăng nhập trên máy nào cũng thấy cùng một tiến độ. Góc trên cùng hiện trạng thái: **Đã đồng bộ**, **Đang lưu…** hoặc **Đang ngoại tuyến**.

## Cập nhật từ bản cũ (bản Sổ tay TOEIC)

Đã có repository, Pages và Supabase chạy rồi thì **không cần làm lại bước 2 và 3**, và không cần chạy lại `schema.sql`.

1. Giải nén file zip mới. **Xóa file `js/config.js` trong thư mục vừa giải nén**, vì file đó trong zip để trống và sẽ ghi đè khóa kết nối của bạn.
2. Trên GitHub, vào repository, bấm **Add file > Upload files**, kéo toàn bộ phần còn lại vào, **Commit changes**. Các file trùng tên sẽ được thay mới.
3. Xóa file cũ không còn dùng: mở `js/data.js`, bấm biểu tượng thùng rác, **Commit changes**. (Nếu để lại thì vô hại, chỉ thừa.)
4. Đợi 1 đến 2 phút, mở trang và nhấn tải lại cứng (Ctrl+Shift+R, trên điện thoại thì đóng hẳn tab rồi mở lại) để không dùng bản cũ trong bộ nhớ đệm.

Tiến độ cũ được chuyển sang định dạng mới tự động khi bạn mở trang: lịch ôn cũ đổi sang FSRS, từ bạn đã thêm giữ nguyên. Phần luyện Part 5 và bảng cấu trúc bài thi của bản cũ không còn trong bản này, vì trang giờ chỉ học từ vựng.

## Lưu ý

- Nghĩa tiếng Việt, câu ví dụ, họ từ, cụm đi kèm và chủ đề của bộ TOEIC do Claude viết và có một lượt rà soát độc lập, chưa qua người kiểm tra. Gặp chỗ sai thì bấm **Sửa** ngay trên từ đó, bản sửa lưu riêng cho bạn và đồng bộ theo tài khoản.
- Dự án Supabase miễn phí có thể bị tạm dừng nếu khoảng một tuần không có hoạt động. Khi đó vào bảng điều khiển Supabase và bấm khôi phục. Dữ liệu không mất.
- Tiến độ cũng được lưu trên máy bạn, nên mất mạng vẫn học được và sẽ đồng bộ khi có mạng lại. Nếu hai thiết bị sửa cùng lúc, bản sửa sau cùng thắng.
- Thư viện đăng nhập được nạp từ `cdn.jsdelivr.net`, ghim một phiên bản trong `index.html`. Muốn nâng cấp thì đổi số phiên bản ở dòng `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@...">`.

## Nguồn dữ liệu và giấy phép

Danh sách từ và thứ hạng lấy từ **TOEIC Service List** (Browne, C. và Culligan, B., newgeneralservicelist.com), giấy phép **Creative Commons Attribution-ShareAlike 4.0**. Các file `js/toeic.js` và `js/toeic_extra.js` là bản chuyển thể (thêm nghĩa tiếng Việt, câu ví dụ, họ từ, cụm đi kèm, chủ đề) nên giữ nguyên giấy phép CC BY-SA 4.0. Đề thi TOEIC thật có bản quyền của ETS và không được dùng ở đây.

## Cấu trúc thư mục

```
index.html            Trang chính
css/style.css         Giao diện
js/config.js          Khóa kết nối Supabase (bạn điền)
js/toeic.js           1259 từ TOEIC: từ, loại từ, nghĩa, ví dụ (xếp theo mức độ thường gặp)
js/toeic_extra.js     Họ từ, cụm đi kèm, chủ đề của từng từ
js/srs.js             Thuật toán lặp lại ngắt quãng FSRS-6
js/logic.js           Chọn dạng bài, che từ trong câu, mức và bài, chủ đề, thống kê, chuỗi ngày
js/tts.js             Phát âm bằng giọng đọc của trình duyệt
js/store.js           Lưu trên máy và đồng bộ lên Supabase
js/app.js             Giao diện và đăng nhập
tests/                Kiểm tra tự động (chạy: node tests/logic.test.js, data.test.js, store.test.js)
supabase/schema.sql   Bảng dữ liệu và quy tắc bảo mật
```
