import { sql, getPool } from './config/db.js';

async function test() {
  try {
    const p = await getPool();
    const c = await p.request().query("SELECT vehicle_id, model_name, owner_id FROM Vehicle WHERE owner_id = 4");
    console.log('Cars owned by user 4:', c.recordset);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

test();
