import express from 'express';
import { db } from '../models/index.js';

const router = express.Router();

// --- Simulated Email API (For Inbox Component) ---
router.get('/api/emails', async (req, res) => {
  try {
    const emails = await db.emails.findMany();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải hòm thư ảo.' });
  }
});

router.post('/api/emails/mark-read', async (req, res) => {
  try {
    await db.emails.markAllAsRead();
    res.json({ message: 'Đã đánh dấu tất cả thư là đã đọc.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật hòm thư.' });
  }
});

router.post('/api/emails/clear', async (req, res) => {
  try {
    await db.emails.clearAll();
    res.json({ message: 'Đã xóa toàn bộ hòm thư ảo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa hòm thư.' });
  }
});

export default router;
