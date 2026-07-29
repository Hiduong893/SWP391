-- ==============================================================================
-- SCRIPT TẠO GIAO DỊCH VÀ ĐÁNH GIÁ MẪU CHO CÁC XE TRONG DATABASE
-- (Bản cập nhật sử dụng Cursor để tương thích với các ID xe thay đổi)
-- ==============================================================================

USE CarRentalPlatform;
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- 0. ĐẢM BẢO CÓ SẴN CÁC USER MẪU (DÙNG CHO CHỦ XE VÀ NGƯỜI THUÊ)
    IF NOT EXISTS (SELECT * FROM [User] WHERE user_id = 1)
    BEGIN
        SET IDENTITY_INSERT [User] ON;
        INSERT INTO [User] (user_id, email, full_name, google_id, is_active, is_email_verified) 
        VALUES (1, 'owner@vivucar.vn', N'Chủ Xe Mẫu', 'mock_g1', 1, 1);
        SET IDENTITY_INSERT [User] OFF;
    END

    IF NOT EXISTS (SELECT * FROM [User] WHERE user_id = 2)
    BEGIN
        SET IDENTITY_INSERT [User] ON;
        INSERT INTO [User] (user_id, email, full_name, google_id, is_active, is_email_verified) 
        VALUES 
        (2, 'renter1@vivucar.vn', N'Nguyễn Văn A', 'mock_g2', 1, 1),
        (3, 'renter2@vivucar.vn', N'Trần Thị B', 'mock_g3', 1, 1),
        (4, 'renter3@vivucar.vn', N'Lê Văn C', 'mock_g4', 1, 1);
        SET IDENTITY_INSERT [User] OFF;
    END

    -- Khai báo các biến cần thiết
    DECLARE @current_vehicle_id INT;
    DECLARE @owner_id INT = 1; -- ID của chủ xe
    DECLARE @renter_id INT;
    DECLARE @new_booking_id INT;

    DECLARE @daily_price DECIMAL(18,2);
    DECLARE @deposit_amount DECIMAL(18,2);
    DECLARE @category_id INT;
    
    DECLARE @rental_price DECIMAL(18,2);
    DECLARE @total_amount DECIMAL(18,2);

    DECLARE @start_date DATETIME2;
    DECLARE @end_date DATETIME2;
    DECLARE @days_rented INT;

    DECLARE @rating_vehicle INT;
    DECLARE @rating_owner INT;
    DECLARE @comment NVARCHAR(2000);

    DECLARE @suv_cat INT = (SELECT category_id FROM VehicleCategory WHERE category_name = 'SUV');
    DECLARE @sedan_cat INT = (SELECT category_id FROM VehicleCategory WHERE category_name = 'Sedan');
    DECLARE @mpv_cat INT = (SELECT category_id FROM VehicleCategory WHERE category_name = 'MPV');

    -- Sử dụng Cursor để lặp qua tất cả các xe (bỏ qua 2 xe đầu tiên để test trạng thái không có lịch)
    DECLARE vehicle_cursor CURSOR FOR 
    SELECT vehicle_id, daily_price, deposit_amount, category_id
    FROM Vehicle
    ORDER BY vehicle_id
    OFFSET 2 ROWS;

    OPEN vehicle_cursor;
    FETCH NEXT FROM vehicle_cursor INTO @current_vehicle_id, @daily_price, @deposit_amount, @category_id;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- 1. TẠO GIAO DỊCH (BOOKING) ĐÃ HOÀN THÀNH

        -- Lấy người dùng thực tế từ bảng User để đảm bảo không bị lỗi khóa ngoại
        SELECT TOP 1 @owner_id = user_id FROM [User];
        SELECT TOP 1 @renter_id = user_id FROM [User] WHERE user_id <> @owner_id;
        IF @renter_id IS NULL SET @renter_id = @owner_id; 

        -- Tạo ngày thuê ngẫu nhiên trong quá khứ
        SET @days_rented = (@current_vehicle_id % 5) + 2; -- Thuê từ 2 đến 6 ngày
        SET @start_date = DATEADD(DAY, -((@current_vehicle_id % 30) * 5), GETDATE());
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
        SET @comment = 
            CASE 
                WHEN @category_id = @suv_cat THEN N'Xe SUV gầm cao, đi đường trường rất thích. Nội thất rộng rãi, sạch sẽ. Chủ xe nhiệt tình.'
                WHEN @category_id = @sedan_cat THEN N'Xe sedan nhỏ gọn, tiết kiệm xăng, phù hợp đi trong thành phố. Thủ tục nhanh gọn, sẽ thuê lại.'
                WHEN @category_id = @mpv_cat THEN N'Xe 7 chỗ rộng rãi, phù hợp cho cả gia đình đi du lịch. Xe được bảo dưỡng tốt, chạy rất êm.'
                ELSE N'Trải nghiệm thuê xe tuyệt vời! Xe mới, sạch sẽ và được trang bị đầy đủ tiện nghi. Rất đáng tiền.'
            END;

        -- Chèn vào bảng Review
        INSERT INTO Review (booking_id, reviewer_id, vehicle_id, owner_id, rating_vehicle, rating_owner, comment, created_at, updated_at)
        VALUES (@new_booking_id, @renter_id, @current_vehicle_id, @owner_id, @rating_vehicle, @rating_owner, @comment, GETDATE(), GETDATE());

        -- Lấy xe tiếp theo
        FETCH NEXT FROM vehicle_cursor INTO @current_vehicle_id, @daily_price, @deposit_amount, @category_id;
    END;

    CLOSE vehicle_cursor;
    DEALLOCATE vehicle_cursor;

    -- Nếu mọi thứ thành công, commit transaction
    COMMIT TRANSACTION;
    PRINT 'Đã thêm thành công giao dịch và đánh giá cho tất cả xe!';

END TRY
BEGIN CATCH
    -- Đóng cursor nếu đang lỗi
    IF CURSOR_STATUS('global', 'vehicle_cursor') >= -1
    BEGIN
        CLOSE vehicle_cursor;
        DEALLOCATE vehicle_cursor;
    END

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
