import { sql, getPool } from '../config/db.js';

export const mapTicketRow = async (p, row) => {
  const ticketId = row.ticket_id;

  const msgRes = await p.request().input('ticketId', sql.Int, ticketId)
    .query(`
      SELECT m.*, u.full_name as senderName, r.role_name as senderRoleName
      FROM TicketMessage m
      INNER JOIN [User] u ON m.sender_id = u.user_id
      LEFT JOIN UserRole ur ON u.user_id = ur.user_id
      LEFT JOIN Role r ON ur.role_id = r.role_id
      WHERE m.ticket_id = @ticketId
      ORDER BY m.sent_at ASC
    `);

  const replies = msgRes.recordset.map(msg => {
    let role = 'renter';
    if (msg.senderRoleName === 'Admin') role = 'admin';
    else if (msg.senderRoleName === 'CustomerService') role = 'cskh';
    else if (msg.senderRoleName === 'CarOwner') role = 'owner';

    return {
      senderId: String(msg.sender_id),
      senderName: msg.senderName,
      senderRole: role,
      message: msg.message,
      sentAt: msg.sent_at ? new Date(msg.sent_at).toISOString() : new Date().toISOString()
    };
  });

  const firstMsg = replies[0] || { message: '' };

  const userRes = await p.request().input('userId', sql.Int, row.user_id)
    .query(`
      SELECT r.role_name FROM UserRole ur INNER JOIN Role r ON ur.role_id = r.role_id WHERE ur.user_id = @userId
    `);
  let userRole = 'renter';
  if (userRes.recordset.length > 0) {
    const roleName = userRes.recordset[0].role_name;
    if (roleName === 'Admin') userRole = 'admin';
    else if (roleName === 'CustomerService') userRole = 'cskh';
    else if (roleName === 'CarOwner') userRole = 'owner';
  }

  let mappedStatus = row.status.toLowerCase();
  if (mappedStatus === 'inprogress') {
    mappedStatus = 'replied';
  }

  return {
    id: String(row.ticket_id),
    userId: String(row.user_id),
    userName: row.userName,
    userRole,
    subject: row.subject,
    message: firstMsg.message,
    status: mappedStatus,
    replies,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
};

export const ticketModel = {
  findMany: async (filter = {}) => {
    const p = await getPool();
    let query = 'SELECT t.*, u.full_name as userName, u.email as userEmail FROM SupportTicket t INNER JOIN [User] u ON t.user_id = u.user_id';
    let where = [];
    const request = p.request();

    if (filter.userId) {
      where.push('t.user_id = @userId');
      request.input('userId', sql.Int, parseInt(filter.userId));
    }
    if (filter.status) {
      where.push('t.status = @status');
      request.input('status', sql.VarChar, filter.status);
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' ORDER BY t.created_at DESC';

    const res = await request.query(query);
    return Promise.all(res.recordset.map(async (row) => await mapTicketRow(p, row)));
  },
  findOne: async (filter) => {
    const p = await getPool();
    let query = 'SELECT t.*, u.full_name as userName, u.email as userEmail FROM SupportTicket t INNER JOIN [User] u ON t.user_id = u.user_id';
    let where = [];
    const request = p.request();

    if (filter.id) {
      where.push('t.ticket_id = @id');
      request.input('id', sql.Int, parseInt(filter.id));
    }

    if (where.length === 0) return null;
    query += ' WHERE ' + where.join(' AND ');
    const res = await request.query(query);
    if (res.recordset.length === 0) return null;
    return await mapTicketRow(p, res.recordset[0]);
  },
  create: async (ticketData) => {
    const p = await getPool();

    const userId = parseInt(ticketData.userId);
    const subject = ticketData.subject;
    const message = ticketData.message;

    const request = p.request()
      .input('userId', sql.Int, userId)
      .input('subject', sql.NVarChar, subject);

    const insertTicketQuery = `
      INSERT INTO SupportTicket (user_id, subject, status, priority, created_at, updated_at)
      VALUES (@userId, @subject, 'Open', 'Normal', GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() as ticket_id;
    `;
    const res = await request.query(insertTicketQuery);
    const ticketId = res.recordset[0].ticket_id;

    await p.request()
      .input('ticketId', sql.Int, ticketId)
      .input('senderId', sql.Int, userId)
      .input('message', sql.NVarChar, message)
      .query('INSERT INTO TicketMessage (ticket_id, sender_id, message, sent_at) VALUES (@ticketId, @senderId, @message, GETDATE())');

    return await ticketModel.findOne({ id: String(ticketId) });
  },
  update: async (id, updateData) => {
    const p = await getPool();
    const ticketId = parseInt(id);

    if (updateData.status !== undefined) {
      let dbStatus = updateData.status;
      const lower = dbStatus.toLowerCase();
      if (lower === 'open') dbStatus = 'Open';
      else if (lower === 'inprogress' || lower === 'replied') dbStatus = 'InProgress';
      else if (lower === 'resolved') dbStatus = 'Resolved';
      else if (lower === 'closed') dbStatus = 'Closed';

      await p.request()
        .input('ticketId', sql.Int, ticketId)
        .input('status', sql.NVarChar, dbStatus)
        .query('UPDATE SupportTicket SET status = @status, updated_at = GETDATE() WHERE ticket_id = @ticketId');
    }

    if (updateData.replies !== undefined && Array.isArray(updateData.replies)) {
      const msgRes = await p.request().input('ticketId', sql.Int, ticketId).query('SELECT message_id FROM TicketMessage WHERE ticket_id = @ticketId');
      const dbMsgCount = msgRes.recordset.length;

      if (updateData.replies.length > dbMsgCount) {
        for (let i = dbMsgCount; i < updateData.replies.length; i++) {
          const reply = updateData.replies[i];
          const senderId = parseInt(reply.senderId);
          await p.request()
            .input('ticketId', sql.Int, ticketId)
            .input('senderId', sql.Int, senderId)
            .input('message', sql.NVarChar, reply.message)
            .query('INSERT INTO TicketMessage (ticket_id, sender_id, message, sent_at) VALUES (@ticketId, @senderId, @message, GETDATE())');
        }
      }
    }

    return await ticketModel.findOne({ id: String(ticketId) });
  }
};
