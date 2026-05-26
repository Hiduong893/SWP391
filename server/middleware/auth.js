import jwt from 'jsonwebtoken';
import { db } from '../database.js';

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Không có quyền truy cập. Vui lòng đăng nhập.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'swp391-super-secret-key-12345';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = db.users.findOne({ id: decoded.userId });
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại hoặc đã bị xóa.' });
    }

    // Attach user to request object (excluding password for security)
    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Phiên làm việc hết hạn hoặc token không hợp lệ.' });
  }
};
