-- ==============================================================================
-- SCRIPT TẠO GIAO DỊCH VÀ ĐÁNH GIÁ MẪU CHO CÁC XE CÒN LẠI (ID 3 ĐẾN 33)
-- Giả định:
-- - Đã có sẵn các xe từ ID 1 đến 33.
-- - Đã có sẵn các user: owner_id = 1, và các renter_id = 2, 3, 4.
-- ==============================================================================

USE CarRentalPlatform;
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- Khai báo các biến cần thiết
    DECLARE @current_vehicle_id INT = 3;
    DECLARE @owner_id INT = 1; -- ID của chủ xe (owner@vivucar.vn)
    DECLARE @renter_id INT;
    DECLARE @new_booking_id INT;

    DECLARE @daily_price DECIMAL(18,2);
    DECLARE @deposit_amount DECIMAL(18,2);
    DECLARE @rental_price DECIMAL(18,2);
    DECLARE @total_amount DECIMAL(18,2);

    DECLARE @start_date DATETIME2;
    DECLARE @end_date DATETIME2;
    DECLARE @days_rented INT;

    DECLARE @rating_vehicle INT;
    DECLARE @rating_owner INT;
    DECLARE @comment NVARCHAR(2000);

    -- Vòng lặp để xử lý từ xe ID 3 đến 33
    WHILE @current_vehicle_id <= 33
    BEGIN
        -- 1. TẠO GIAO DỊCH (BOOKING) ĐÃ HOÀN THÀNH

        -- Lấy thông tin giá của xe hiện tại
        SELECT 
            @daily_price = daily_price, 
            @deposit_amount = deposit_amount 
        FROM Vehicle 
        WHERE vehicle_id = @current_vehicle_id;

        -- Chọn một người thuê ngẫu nhiên (renter_id từ 2, 3, 4)
        SET @renter_id = (@current_vehicle_id % 3) + 2; 

        -- Tạo ngày thuê ngẫu nhiên trong quá khứ
        SET @days_rented = (@current_vehicle_id % 5) + 2; -- Thuê từ 2 đến 6 ngày
        SET @start_date = DATEADD(DAY, -(@current_vehicle_id * 5), GETDATE());
        SET @end_date = DATEADD(DAY, @days_rented, @start_date);

        -- Tính toán chi phí
        SET @rental_price = @daily_price * @days_rented;
        SET @total_amount = @rental_price + @deposit_amount;

        -- Chèn vào bảng Booking
        INSERT INTO Booking (renter_id, vehicle_id, start_datetime, end_datetime, rental_price, deposit_amount, total_amount, status, created_at, updated_at)
        VALUES (@renter_id, @current_vehicle_id, @start_date, @end_date, @rental_price, @deposit_amount, @total_amount, 'Completed', GETDATE(), GETDATE());

        -- Lấy ID của booking vừa tạo
        SET @new_booking_id = SCOPE_IDENTITY();

        -- 2. TẠO ĐÁNH GIÁ (REVIEW) TƯƠNG ỨNG

        -- Tạo rating và comment ngẫu nhiên
        SET @rating_vehicle = 4 + (@current_vehicle_id % 2); -- Rating 4 hoặc 5
        SET @rating_owner = 4 + ((@current_vehicle_id + 1) % 2); -- Rating 4 hoặc 5

        -- Chọn comment dựa trên loại xe
        SELECT @comment = 
            CASE 
                WHEN category_id = (SELECT category_id FROM VehicleCategory WHERE category_name = 'SUV') THEN N'Xe SUV gầm cao, đi đường trường rất thích. Nội thất rộng rãi, sạch sẽ. Chủ xe nhiệt tình.'
                WHEN category_id = (SELECT category_id FROM VehicleCategory WHERE category_name = 'Sedan') THEN N'Xe sedan nhỏ gọn, tiết kiệm xăng, phù hợp đi trong thành phố. Thủ tục nhanh gọn, sẽ thuê lại.'
                WHEN category_id = (SELECT category_id FROM VehicleCategory WHERE category_name = 'MPV') THEN N'Xe 7 chỗ rộng rãi, phù hợp cho cả gia đình đi du lịch. Xe được bảo dưỡng tốt, chạy rất êm.'
                ELSE N'Trải nghiệm thuê xe tuyệt vời! Xe mới, sạch sẽ và được trang bị đầy đủ tiện nghi. Rất đáng tiền.'
            END
        FROM Vehicle WHERE vehicle_id = @current_vehicle_id;

        -- Chèn vào bảng Review
        INSERT INTO Review (booking_id, reviewer_id, vehicle_id, owner_id, rating_vehicle, rating_owner, comment, created_at, updated_at)
        VALUES (@new_booking_id, @renter_id, @current_vehicle_id, @owner_id, @rating_vehicle, @rating_owner, @comment, GETDATE(), GETDATE());

        -- Chuyển sang xe tiếp theo
        SET @current_vehicle_id = @current_vehicle_id + 1;
    END;

    -- Nếu mọi thứ thành công, commit transaction
    COMMIT TRANSACTION;
    PRINT 'Đã thêm thành công giao dịch và đánh giá cho 31 xe còn lại!';

END TRY
BEGIN CATCH
    -- Nếu có lỗi, rollback tất cả thay đổi
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    -- In ra thông báo lỗi
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    PRINT 'Gặp lỗi! Đang rollback tất cả các thay đổi...';
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
GO
