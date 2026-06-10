import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 5000,
};

console.log('Testing connection with config:', {
  user: config.user,
  password: config.password,
  server: config.server,
  database: config.database,
});

try {
  const pool = await sql.connect(config);
  console.log('Connected successfully!');
  await pool.close();
} catch (e) {
  console.error('Connection failed:', e.stack || e.message);
}
process.exit(0);
