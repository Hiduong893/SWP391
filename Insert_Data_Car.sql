USE CarRentalPlatform;
GO

-- Thêm cột transmission và fuel nếu chưa tồn tại trong bảng Vehicle
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicle') AND name = 'transmission')
BEGIN
    ALTER TABLE Vehicle ADD transmission NVARCHAR(50) NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicle') AND name = 'fuel')
BEGIN
    ALTER TABLE Vehicle ADD fuel NVARCHAR(50) NULL;
END;

GO

-- 1. Thêm Hãng Xe MG nếu chưa tồn tại
IF NOT EXISTS (SELECT 1 FROM Brand WHERE brand_name = N'MG')
BEGIN
    INSERT INTO Brand (brand_name, is_active) VALUES (N'MG', 1);
END;

-- 2. Tự động tìm user_id đại diện cho Chủ xe cho thuê (owner@bonboncar.vn) để gán xe
DECLARE @owner_id INT;
SELECT TOP 1 @owner_id = user_id FROM [User] WHERE email = 'owner@bonboncar.vn';
IF @owner_id IS NULL
BEGIN
    SELECT TOP 1 @owner_id = user_id FROM [User] WHERE email = 'owner@vivucar.vn';
END;
IF @owner_id IS NULL
BEGIN
    SELECT TOP 1 @owner_id = user_id FROM [User] ORDER BY user_id ASC;
END;

-- Nếu CSDL chưa có user nào (vì chưa chạy backend bao giờ), tự động tạo 1 user chủ xe để gán
IF @owner_id IS NULL
BEGIN
    INSERT INTO [User] (email, full_name, is_active, is_email_verified)
    VALUES ('owner@bonboncar.vn', N'Chủ Xe ViVuCar', 1, 1);
    SET @owner_id = SCOPE_IDENTITY();
    
    INSERT INTO UserRole (user_id, role_id)
    SELECT @owner_id, role_id FROM Role WHERE role_name = 'CarOwner';
END;

-- Xóa dữ liệu cũ nếu muốn làm sạch trước khi chạy (tùy chọn - đã comment)
 --DELETE FROM VehicleImage;
-- DELETE FROM Vehicle;

-- 3. Chèn 33 xe với các hãng xe theo yêu cầu
INSERT INTO Vehicle (
    owner_id, brand_id, category_id,
    model_name, license_plate,
    year_of_manufacture, color, seat_count,
    daily_price, deposit_amount,
    location_address, status, is_active, transmission, fuel
)
VALUES
-- Toyota
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Toyota'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'Vios G', '30K-567.89', 2023, N'Trắng', 5, 800000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Toyota'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'Fortuner Legender', '51K-234.56', 2022, N'Đen', 7, 1300000.00, 15000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Dầu'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Toyota'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'MPV'), N'Innova Cross', '43A-789.01', 2023, N'Bạc', 7, 1000000.00, 15000000.00, N'Đà Nẵng', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Toyota'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'Corolla Cross', '30L-112.23', 2024, N'Đỏ', 5, 950000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),

-- VinFast
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'VinFast'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Hatchback'), N'VF 3 Plus', '30L-999.01', 2025, N'Vàng', 4, 500000.00, 5000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Điện'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'VinFast'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'VF 5 Plus', '51L-888.02', 2024, N'Xanh Dương', 5, 700000.00, 10000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Điện'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'VinFast'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'VF 8 Plus', '43A-666.03', 2023, N'Xám', 5, 1200000.00, 15000000.00, N'Đà Nẵng', 'Available', 1, N'Tự động', N'Điện'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'VinFast'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'VF 9 Plus', '30K-777.04', 2024, N'Đen', 7, 2200000.00, 20000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Điện'),

-- Honda
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Honda'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'City RS', '30K-444.11', 2023, N'Đỏ', 5, 800000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Honda'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'Civic RS', '51K-555.22', 2022, N'Trắng', 5, 1000000.00, 15000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Honda'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'CR-V L', '43A-333.33', 2023, N'Đen', 7, 1200000.00, 15000000.00, N'Đà Nẵng', 'Available', 1, N'Tự động', N'Xăng'),

-- Hyundai
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Hyundai'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'Accent 1.4 AT', '30L-222.11', 2023, N'Trắng', 5, 750000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Hyundai'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'SantaFe Dầu Cao Cấp', '51L-999.00', 2022, N'Đen', 7, 1400000.00, 15000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Dầu'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Hyundai'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'Tucson 2.0 AT', '43A-888.88', 2023, N'Đỏ', 5, 1000000.00, 10000000.00, N'Đà Nẵng', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Hyundai'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Hatchback'), N'Grand i10', '30K-111.00', 2021, N'Bạc', 5, 550000.00, 5000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),

-- Mazda
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mazda'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'Mazda 3 Premium', '30K-888.99', 2023, N'Đỏ', 5, 800000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mazda'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'CX-5 2.0 Premium', '51K-777.66', 2023, N'Trắng', 5, 1000000.00, 15000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mazda'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'Mazda 6 2.0 Luxury', '43A-555.44', 2022, N'Xám', 5, 1100000.00, 15000000.00, N'Đà Nẵng', 'Available', 1, N'Tự động', N'Xăng'),

-- Ford
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Ford'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'Ranger Wildtrak', '30L-666.88', 2024, N'Cam', 5, 1200000.00, 15000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Dầu'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Ford'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'Everest Titanium', '51K-123.99', 2023, N'Trắng', 7, 1500000.00, 15000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Dầu'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Ford'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'Territory Titanium', '43A-112.34', 2024, N'Đen', 5, 1000000.00, 10000000.00, N'Đà Nẵng', 'Available', 1, N'Tự động', N'Xăng'),

-- Mitsubishi
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mitsubishi'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'MPV'), N'Xpander Premium', '30K-987.65', 2023, N'Trắng', 7, 950000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mitsubishi'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'Outlander 2.0 CVT', '51L-456.78', 2022, N'Xám', 7, 1100000.00, 15000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),

-- Suzuki
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Suzuki'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Hatchback'), N'Swift GLX', '30L-333.22', 2022, N'Xanh Dương', 5, 700000.00, 5000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Suzuki'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'MPV'), N'XL7 GLX', '51K-888.77', 2023, N'Khaki', 7, 900000.00, 10000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),

-- Nissan
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Nissan'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'Almera VL', '30K-123.11', 2022, N'Trắng', 5, 750000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Nissan'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'Kicks e-Power', '51K-999.11', 2023, N'Đỏ', 5, 950000.00, 10000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),

-- MG
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'MG'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Crossover'), N'ZS Smart Up Lux', '30K-456.78', 2023, N'Đỏ', 5, 800000.00, 10000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'MG'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'MG5 Luxury', '51K-789.22', 2023, N'Vàng', 5, 750000.00, 10000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),

-- Mercedes-Benz
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mercedes-Benz'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'C200 Avantgarde', '30K-999.99', 2024, N'Đen', 5, 2000000.00, 20000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'Mercedes-Benz'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'GLC 300 4MATIC', '51K-555.55', 2023, N'Trắng', 5, 2500000.00, 20000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng'),

-- BMW
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'BMW'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'Sedan'), N'320i Sport Line', '30K-888.88', 2024, N'Xanh Dương', 5, 2000000.00, 20000000.00, N'Hà Nội', 'Available', 1, N'Tự động', N'Xăng'),
(@owner_id, (SELECT brand_id FROM Brand WHERE brand_name = N'BMW'), (SELECT category_id FROM VehicleCategory WHERE category_name = N'SUV'), N'X5 xDrive40i', '51L-222.22', 2023, N'Đen', 7, 3500000.00, 20000000.00, N'TP. Hồ Chí Minh', 'Available', 1, N'Tự động', N'Xăng');


-- 4. Chèn đường dẫn ảnh tương ứng cho các xe vừa khởi tạo
INSERT INTO VehicleImage (vehicle_id, image_url, is_primary, sort_order)
VALUES
-- Toyota
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-567.89'), 'https://www.toyotathanhxuan.vn/wp-content/uploads/2026/01/b4dcef_67254686254c426298a2df3bd59824edmv2-4.jpeg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-234.56'), 'https://toyotaanthanh.com.vn/wp-content/uploads/2023/03/z4147446808217_ca3b22c8aa190fffeee30f99a9284b83.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '43A-789.01'), 'https://drive.gianhangvn.com/image/ngoai-that-xe-toyota-innova-cross-1-2520996j22961.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30L-112.23'), 'https://toyotalongphuoc-ht.com.vn/OTO3602100232/files/san-pham/corolla_cross/album/453626555_832294839001357_755549.webp', 1, 0),

-- VinFast
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30L-999.01'), 'https://cdn3738.cdn4s7.io.vn/media/tin-tuc/vf3-plus-co-gi-moi.webp', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51L-888.02'), 'https://vinfast-auto-vn.net/wp-content/uploads/2022/12/Anh-dai-dien-1200x823.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '43A-666.03'), 'https://xevinfastluot.com/wp-content/uploads/2024/12/z6173863956629_2fde440d370c0217a5688929dfffdbcb.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-777.04'), 'https://xevinfastluot.com/wp-content/uploads/2024/12/z6090099387096_edc1b1d7c97edec3c0a069bcc236c75b.jpg', 1, 0),

-- Honda
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-444.11'), 'https://otohondavinhphuc.com/wp-content/uploads/2021/06/%E1%BA%A3nh-xe-honda-city-rs.jpg ', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-555.22'), 'https://hondatayninhoto.com/wp-content/uploads/2023/07/z4496367164683_de63c0130a96db0468ac250f4bfa1c06.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '43A-333.33'), 'https://drive.gianhangvn.com/image/honda-crv-2024-bv-32-2522124j24258.jpg', 1, 0),

-- Hyundai
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30L-222.11'), 'https://cbi.vn//ckfinder/userfiles/images/Gia-xe-Hyundai-Accent-lan-banh-thang-9-2023-giam-50-le-phi-truoc-ba-ava18-1693760972-336-width740height555.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51L-999.00'), 'https://img1.oto.com.vn/2024/08/05/685e6daa-f01c_wm.webp', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '43A-888.88'), 'https://cdn-img-v2.mybota.vn/uploadv2/web/89/8958/product/2024/08/26/02/15/1724656087_2.jpg?v=4', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-111.00'), 'https://cdn.oto360.net/images/car/hyundai/i10_hatchback_2406.webp', 1, 0),

-- Mazda
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-888.99'), 'https://cdn-img-v2.mybota.vn/uploadv2/web/89/8958/product/2023/11/14/09/26/1699950809_2.jpg?v=4', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-777.66'), 'https://bizweb.dktcdn.net/100/446/720/products/z6793267408691-01b973e2a8c044c43f1c90af44265c9e.jpg?v=1752208075887', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '43A-555.44'), 'https://e-cdn.carpla.vn/carpla-ecom/blog/danh-gia-chung-xe-mazda-6-2022-1758705066.818.jpg', 1, 0),
    
-- Ford
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30L-666.88'), 'https://img1.oto.com.vn/crop/640x480/2020/01/15/20200115-e8161dc2-5811-4e4a-85a0-da52a3273b29-1000-af92.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-123.99'), 'https://www.hathanhford.com.vn/wp-content/uploads/ever-tita-4x2-ban-nang-cap-2.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '43A-112.34'), 'https://ford-benthanh.com/wp-content/uploads/2024/03/territory-titanium-den.jpg', 1, 0),

-- Mitsubishi
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-987.65'), 'https://cdn.chotot.com/98IVja4ku-oMS3YIcewo1GQyTYo5bw_SWAetN4uuEYM/preset:view/plain/2c27fd4e7c5bf1e2f2e9333101e26c2f-2984281301859678897.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51L-456.78'), 'https://tinbanxe.vn/uploads/tin-tuc/mceu_75370547861631248386880.jpg', 1, 0),

-- Suzuki
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30L-333.22'), 'https://binhduongngoisao.vn/wp-content/uploads/2025/06/Suzuki-Swift-98.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-888.77'), 'https://images2.thanhnien.vn/zoom/686_429/528068263637045248/2023/6/18/suzuki-xl7-hybrid-3-16870517983631881597110-0-16-725-1177-crop-1687052114695287618313.jpeg', 1, 0),

-- Nissan
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-123.11'), 'https://i2-vnexpress.vnecdn.net/2022/07/22/Elite15copyjpg-1658482482.jpg?w=700&h=420&q=100&dpr=1&fit=crop&s=zwcUVnlJKj40YN-6GV0vCw', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-999.11'), 'https://thanhnien.mediacdn.vn/Uploaded/chicuong/2022_08_16/2023-nissan-kicks-e-power-philippines-62d0fe30df838-1306.jpg', 1, 0),

-- MG
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-456.78'), 'https://mg-hadong.com/wp-content/uploads/2022/07/21c3d1b0-07ff-45ee-91de-01297ca528cb.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-789.22'), 'https://xeotochinhhang.com/wp-content/uploads/2024/09/mg5-thai-lan-7-251hqaa.jpg', 1, 0),

-- Mercedes-Benz
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-999.99'), 'https://mercedes-saigon.com.vn/quannguyenphat/uploads/2019/04/Mercedes-C200-Avantgarde-6.jpg.webp', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51K-555.55'), 'https://i.pinimg.com/736x/4c/da/b1/4cdab1c2b59f1c6bba05c6085ff9a7da.jpg', 1, 0),

-- BMW
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '30K-888.88'), 'https://autopro8.mediacdn.vn/134505113543774208/2024/7/31/bmw-320i-2024-sport-line-13-17224283764591872066808.jpg', 1, 0),
((SELECT vehicle_id FROM Vehicle WHERE license_plate = '51L-222.22'), 'https://drive.gianhangvn.com/image/o4ewvc6-2537248j32655.jpg', 1, 0);

PRINT 'Vehicles database seed successfully!';
