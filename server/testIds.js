import { getPool } from './config/db.js';

getPool().then(async p => {
  try {
    const res = await p.request().query("SELECT vehicle_id FROM Vehicle ORDER BY vehicle_id");
    console.log(res.recordset.map(r => r.vehicle_id).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
