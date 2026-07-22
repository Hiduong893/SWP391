import { getPool } from './server/config/db.js';
async function run() {
  const p = await getPool();
  const res = await p.request().query("SELECT TOP 1 b.brand_name, v.model_name FROM Vehicle v LEFT JOIN Brand b ON v.brand_id = b.brand_id");
  console.log(res.recordset);
  process.exit(0);
}
run();
