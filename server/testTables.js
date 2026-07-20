import { getPool } from './config/db.js';

getPool().then(async p => {
  try {
    const res = await p.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.log(res.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
