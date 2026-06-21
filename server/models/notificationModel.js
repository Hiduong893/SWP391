import { sql, getPool } from '../config/db.js';

export const notificationModel = {
  findMany: async (filter = {}) => {
    const p = await getPool();
    let query = 'SELECT * FROM Notification';
    let where = [];
    const request = p.request();

    if (filter.userId !== undefined && filter.userId !== '') {
      where.push('user_id = @userId');
      request.input('userId', sql.Int, parseInt(filter.userId));
    }
    if (filter.isRead !== undefined) {
      where.push('is_read = @isRead');
      request.input('isRead', sql.Bit, filter.isRead ? 1 : 0);
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const res = await request.query(query);
    return res.recordset.map(row => ({
      id: String(row.notification_id),
      userId: String(row.user_id),
      title: row.title,
      message: row.message,
      type: row.notification_type || '',
      referenceId: row.reference_id ? String(row.reference_id) : null,
      referenceType: row.reference_type || null,
      isRead: row.is_read === true || row.is_read === 1,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    }));
  },

  update: async (id, updateData) => {
    const p = await getPool();
    const notificationId = parseInt(id);
    let updates = [];
    const request = p.request().input('notificationId', sql.Int, notificationId);

    if (updateData.isRead !== undefined) {
      updates.push('is_read = @isRead');
      request.input('isRead', sql.Bit, updateData.isRead ? 1 : 0);
    }

    if (updates.length > 0) {
      await request.query(`UPDATE Notification SET ${updates.join(', ')} WHERE notification_id = @notificationId`);
    }

    const res = await p.request().input('notificationId', sql.Int, notificationId)
      .query('SELECT * FROM Notification WHERE notification_id = @notificationId');
    if (res.recordset.length === 0) return null;
    const row = res.recordset[0];
    return {
      id: String(row.notification_id),
      userId: String(row.user_id),
      title: row.title,
      message: row.message,
      type: row.notification_type || '',
      referenceId: row.reference_id ? String(row.reference_id) : null,
      referenceType: row.reference_type || null,
      isRead: row.is_read === true || row.is_read === 1,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  },

  markAllRead: async (userId) => {
    const p = await getPool();
    await p.request()
      .input('userId', sql.Int, parseInt(userId))
      .query('UPDATE Notification SET is_read = 1 WHERE user_id = @userId AND is_read = 0');
  }
};
