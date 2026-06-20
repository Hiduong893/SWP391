/**
 * =============================================================================
 * mountRenterRoutes.js  (Hướng dẫn tích hợp - KHÔNG phải file chạy độc lập)
 * =============================================================================
 * Đây là snippet 2 dòng cần THÊM VÀO server.js gốc để kích hoạt 3 features mới.
 * KHÔNG XÓA hay SỬA bất kỳ dòng nào đã có trong server.js.
 * CHỈ THÊM 2 dòng này vào sau phần import và trước app.listen().
 *
 * =============================================================================
 * BƯỚC THỰC HIỆN:
 * =============================================================================
 *
 * 1. Mở file: server/server.js
 *
 * 2. Tìm đến phần IMPORTS ở đầu file (khoảng dòng 1-10), thêm dòng này:
 *    >>> import renterActionRoutes from './routes/renterActionRoutes.js';
 *
 * 3. Tìm đến phần sau các app.use() middleware (khoảng dòng 21-27), thêm:
 *    >>> app.use('/api/renter', renterActionRoutes);
 *
 * Ví dụ sau khi thêm, phần đầu server.js sẽ trông như sau:
 * =============================================================================
 *
 *   import express from 'express';
 *   import cors from 'cors';
 *   import dotenv from 'dotenv';
 *   import bcrypt from 'bcryptjs';
 *   import jwt from 'jsonwebtoken';
 *   import { OAuth2Client } from 'google-auth-library';
 *   import crypto from 'crypto';
 *   import { db } from './database.js';
 *   import { auth } from './middleware/auth.js';
 *   import nodemailer from 'nodemailer';
 *   // ✅ THÊM DÒNG NÀY (Task 19, 21, 22 - Renter Actions):
 *   import renterActionRoutes from './routes/renterActionRoutes.js';
 *
 *   dotenv.config();
 *   const app = express();
 *   ...
 *   app.use(cors({ ... }));
 *   app.use(express.json({ limit: '10mb' }));
 *   // ✅ THÊM DÒNG NÀY (Mount router độc lập):
 *   app.use('/api/renter', renterActionRoutes);
 *
 * =============================================================================
 * SAU KHI MOUNT - Các API Endpoints mới sẽ hoạt động:
 * =============================================================================
 *
 * [Task 19 - Hủy đặt xe & Hoàn cọc]
 *   GET  /api/renter/bookings/:id/refund-preview
 *   PUT  /api/renter/bookings/:id/cancel-with-refund
 *
 * [Task 21 - Báo cáo sự cố khẩn cấp]
 *   POST /api/renter/bookings/:id/emergency-report
 *   GET  /api/renter/bookings/:id/emergency-report
 *   GET  /api/renter/incident-types
 *
 * [Task 22 - Đánh giá dịch vụ chuyến đi]
 *   POST /api/renter/bookings/:id/trip-review
 *   GET  /api/renter/bookings/:id/trip-review
 *
 * =============================================================================
 */

// Không có code thực thi ở đây - đây là file hướng dẫn tích hợp.
// Xem comment bên trên để biết cách thêm 2 dòng vào server.js.
