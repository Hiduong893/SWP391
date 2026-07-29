# HƯỚNG DẪN DEPLOY VI VU CAR MIỄN PHÍ 100% (VERCEL + RENDER + AZURE SQL)

Tài liệu này hướng dẫn chi tiết từng bước đưa dự án **ViVuCar / SWP391 Car Rental Platform** lên Internet hoàn toàn miễn phí.

---

## 📌 TỔNG QUAN CÁC BƯỚC

1. **Đưa Source Code lên GitHub Repository**
2. **Tạo & Khởi tạo Azure SQL Database (Miễn phí)**
3. **Deploy Backend Node.js lên Render.com (Miễn phí)**
4. **Deploy Frontend React Vite lên Vercel.com (Miễn phí)**
5. **Kiểm tra & Hoàn tất**

---

## BƯỚC 1: ĐƯA SOURCE CODE LÊN GITHUB

1. Khởi tạo Git và commit code (nếu chưa làm):
   ```bash
   git add .
   git commit -m "Prepare production deployment configs"
   ```
2. Tạo 1 repository mới trên GitHub (ví dụ: `SWP391-ViVuCar`).
3. Đẩy code lên GitHub:
   ```bash
   git remote add origin https://github.com/ACCOUNT_CUA_BAN/SWP391-ViVuCar.git
   git branch -M main
   git push -u origin main
   ```

---

## BƯỚC 2: TẠO AZURE SQL DATABASE (MIỄN PHÍ)

1. Đăng ký/Đăng nhập tài khoản [Azure Free Account](https://azure.microsoft.com/free/).
2. Vào **Azure Portal** -> Chọn **Create a resource** -> Tìm **SQL Database**.
3. Điền thông tin:
   - **Database name**: `CarRentalPlatform`
   - **Workload environment**: `Development`
   - **Compute + storage**: Chọn **Free offer / Standard** (Gói miễn phí 32GB vĩnh viễn).
   - **Server**: Tạo server mới (Ví dụ: `vivucar-db-server.database.windows.net`), tạo tài khoản Admin `sa_admin` và password.
   - **Networking**: Bật tùy chọn **Allow Azure services and resources to access this server** và thêm IP hiện tại của bạn vào Firewall rule.
4. Kết nối tới Azure SQL qua **SQL Server Management Studio (SSMS)** hoặc **Azure Query Editor**:
   - Chạy toàn bộ file `Sql_CarRentalPlatform.sql` trong thư mục gốc dự án.
   - Chạy tiếp file `Insert_Data_Car.sql` để chèn dữ liệu mẫu.

---

## BƯỚC 3: DEPLOY BACKEND NỐI CƠ SỞ DỮ LIỆU LÊN RENDER.COM

1. Đăng ký tài khoản trên [Render.com](https://render.com/) (Đăng nhập bằng GitHub).
2. Nhấp chọn **New +** -> Chọn **Web Service**.
3. Kết nối với Repository GitHub của bạn.
4. Điền các thông số:
   - **Name**: `vivucar-backend`
   - **Region**: Singapore (hoặc Oregon)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (hoặc `node server.js`)
   - **Instance Type**: **Free**
5. Kéo xuống mục **Environment Variables** -> Thêm các biến môi trường sau:
   - `DB_SERVER`: Link Azure SQL Server (ví dụ: `vivucar-db-server.database.windows.net`)
   - `DB_USER`: `sa_admin` (Tên user Azure SQL)
   - `DB_PASSWORD`: `Mật_Khẩu_Azure_SQL_Của_Bạn`
   - `DB_DATABASE`: `CarRentalPlatform`
   - `DB_TRUST_SERVER_CERTIFICATE`: `true`
   - `JWT_SECRET`: `Chuoi_Bi_Mat_Tuye_Doi_Safest_123`
   - `GEMINI_API_KEY`: API Key của Gemini AI (nếu dùng chatbot)
   - `CLIENT_URL`: `https://vivucar.vercel.app` (Đường dẫn frontend trên Vercel sau khi tạo ở bước 4)
6. Bấm **Create Web Service**. Render sẽ tiến hành build và khởi chạy. Khi hoàn tất, bạn sẽ có URL backend:
   👉 **URL Backend**: `https://vivucar-backend.onrender.com`

---

## BƯỚC 4: DEPLOY FRONTEND REACT VITE LÊN VERCEL.COM

1. Đăng ký/Đăng nhập [Vercel.com](https://vercel.com/) (Đăng nhập bằng GitHub).
2. Nhấp chọn **Add New...** -> **Project**.
3. Chọn Repository `SWP391-ViVuCar` từ GitHub.
4. Cấu hình dự án:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Chọn **Edit** -> Chọn thư mục `client`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Mở mục **Environment Variables** -> Thêm biến:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://vivucar-backend.onrender.com` *(Link backend vừa nhận từ Bước 3)*
6. Bấm **Deploy**.
   👉 Vercel sẽ tự động build và cung cấp cho bạn link trang web hoàn chỉnh (Ví dụ: `https://vivucar.vercel.app`).

---

## BƯỚC 5: HOÀN TẤT & KIỂM TRA

1. Copy URL trang web Vercel (ví dụ `https://vivucar.vercel.app`) dán lại vào biến môi trường `CLIENT_URL` trên Render.com để CORS cho phép gọi API chuẩn xác nhất.
2. Mở đường dẫn Vercel trên trình duyệt và test các chức năng:
   - Đăng ký / Đăng nhập
   - Tìm xe / Thuê xe
   - Chatbot AI / Đánh giá / Hợp đồng
   - Admin & Owner Dashboard

---

🎉 **Chúc mừng! Dự án ViVuCar của bạn đã được đưa lên Cloud hoàn toàn miễn phí!**
