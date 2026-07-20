import { getPool } from './config/db.js';

getPool().then(async p => {
  try {
    const res = await p.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Vehicle'");
    console.log(res.recordset.map(r => r.COLUMN_NAME).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
