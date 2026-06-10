import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa',
  server: process.env.DB_SERVER || 'GHUY-LAP',
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function test() {
  let log = '';
  log += `Connection config used: server=${config.server}, database=${config.database}, user=${config.user}\n\n`;
  
  try {
    const pool = await sql.connect(config);
    log += 'Successfully connected to SQL Server!\n\n';
    
    // 1. List all tables
    const tablesRes = await pool.request().query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'");
    log += 'Tables found in this database:\n';
    tablesRes.recordset.forEach(t => {
      log += `  - ${t.table_name}\n`;
    });
    
    // 2. Query users count if table exists
    const userTableExists = tablesRes.recordset.some(t => t.table_name.toLowerCase() === 'user');
    if (userTableExists) {
      const countRes = await pool.request().query('SELECT COUNT(*) as count FROM [User]');
      log += `\nTotal rows in [User] table: ${countRes.recordset[0].count}\n`;
      
      const usersRes = await pool.request().query('SELECT user_id, email, full_name FROM [User]');
      log += 'Users found:\n';
      usersRes.recordset.forEach(u => {
        log += `  - ID: ${u.user_id}, Email: "${u.email}", Name: "${u.full_name}"\n`;
      });
    } else {
      log += '\n[User] table NOT found in this database!\n';
    }
    
    await pool.close();
  } catch (error) {
    log += `CRASHED: ${error.stack}\n`;
  }

  fs.writeFileSync('login-output.txt', log);
  console.log('Results written to login-output.txt');
}

test();
