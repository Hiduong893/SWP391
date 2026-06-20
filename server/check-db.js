import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function run() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to database.');
    
    const vehicles = await pool.request().query('SELECT vehicle_id, model_name, license_plate, daily_price FROM Vehicle');
    console.log('Vehicles in DB:', vehicles.recordset);
    
    const brands = await pool.request().query('SELECT * FROM Brand');
    console.log('Brands in DB:', brands.recordset);
    
    await pool.close();
  } catch (err) {
    console.error('Error querying database:', err);
  }
}

run();
