import { getPool } from './config/db.js';

async function check() {
  try {
    const pool = await getPool();
    const res = await pool.request().query('SELECT vehicle_id, model_name, location_address FROM Vehicle');
    console.log(JSON.stringify(res.recordset, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
