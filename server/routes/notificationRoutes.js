import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// 1. GET Notifications for logged-in user
router.get('/api/notifications', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await db.notifications.findMany({ userId });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Lỗi tải danh sách thông báo.' });
  }
});

// 2. PUT Mark notification as read
router.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.user.id);

    const notifications = await db.notifications.findMany({ userId });
    const notification = notifications.find(n => n.id === id);

    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại hoặc không thuộc quyền sở hữu của bạn.' });
    }

    const updated = await db.notifications.update(id, { isRead: true });
    res.json({ message: 'Đã đánh dấu thông báo là đã đọc.', notification: updated });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái thông báo.' });
  }
});

// 3. POST Mark all notifications as read
router.post('/api/notifications/read-all', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.notifications.markAllRead(userId);
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Lỗi cập nhật toàn bộ thông báo.' });
  }
});

export default router;
