import { getPool } from './config/db.js';

getPool().then(async p => {
  try {
    const res = await p.request().query('SELECT * FROM Review');
    console.log(`Found ${res.recordset.length} raw reviews in the database:`);
    console.log(res.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
