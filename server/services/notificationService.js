import { sql, getPool } from '../config/db.js';

export const notificationService = {
  /**
   * Creates a notification for a user, with duplicate prevention in a 10s window.
   */
  createNotification: async (userId, title, message, type, referenceId, referenceType) => {
    try {
      const p = await getPool();
      
      const parsedUserId = parseInt(userId);
      const parsedRefId = referenceId ? parseInt(referenceId) : null;

      // Duplicate prevention check (within 10 seconds)
      if (parsedRefId) {
        const checkDup = await p.request()
          .input('userId', sql.Int, parsedUserId)
          .input('title', sql.NVarChar, title)
          .input('refId', sql.Int, parsedRefId)
          .query(`
            SELECT TOP 1 notification_id 
            FROM Notification
            WHERE user_id = @userId 
              AND title = @title 
              AND reference_id = @refId
              AND created_at > DATEADD(second, -10, GETDATE())
          `);
        if (checkDup.recordset.length > 0) {
          // Skip duplicate creation
          return;
        }
      }

      await p.request()
        .input('userId', sql.Int, parsedUserId)
        .input('title', sql.NVarChar, title)
        .input('message', sql.NVarChar, message)
        .input('type', sql.NVarChar, type || null)
        .input('refId', sql.Int, parsedRefId)
        .input('refType', sql.NVarChar, referenceType || null)
        .query(`
          INSERT INTO Notification (user_id, title, message, notification_type, reference_id, reference_type, is_read, created_at)
          VALUES (@userId, @title, @message, @type, @refId, @refType, 0, GETDATE())
        `);
    } catch (error) {
      console.error('Error in createNotification:', error);
    }
  },

  /**
   * Notifies all CustomerService users (CSKH).
   */
  notifyCSKH: async (title, message, type, referenceId, referenceType) => {
    try {
      const p = await getPool();
      const cskhUsers = await p.request().query(`
        SELECT ur.user_id 
        FROM UserRole ur
        INNER JOIN Role r ON ur.role_id = r.role_id
        WHERE r.role_name = 'CustomerService'
      `);
      for (const user of cskhUsers.recordset) {
        await notificationService.createNotification(
          user.user_id,
          title,
          message,
          type,
          referenceId,
          referenceType
        );
      }
    } catch (error) {
      console.error('Error in notifyCSKH:', error);
    }
  }
};
