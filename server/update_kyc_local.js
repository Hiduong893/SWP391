import { getPool } from './config/db.js';
import sql from 'mssql';

async function updateKyc() {
  try {
    const pool = await getPool();
    console.log('Connected to DB');

    // Tìm user_id của Nguyễn Gia Huy
    const res = await pool.request()
      .input('name', sql.NVarChar, 'Nguyễn Gia Huy')
      .query('SELECT user_id FROM [User] WHERE full_name = @name');
      
    if (res.recordset.length === 0) {
      console.log('Không tìm thấy User Nguyễn Gia Huy');
      process.exit(1);
    }
    const userId = res.recordset[0].user_id;
    
    // Cập nhật trạng thái KYC
    const updateRes = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE KYC 
        SET status = 'Pending' 
        WHERE user_id = @userId AND document_type IN ('NationalID', 'NationalIDBack')
      `);
      
    console.log(`Đã cập nhật ${updateRes.rowsAffected[0]} ảnh CCCD của user_id ${userId} sang trạng thái 'Pending' (Chờ duyệt).`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
updateKyc();
