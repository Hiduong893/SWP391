import { sql, getPool } from './config/db.js';

async function test() {
  try {
    const p = await getPool();
    const users = await p.request().query("SELECT user_id, full_name, email FROM [User] WHERE full_name LIKE N'%Lê Mạnh%'");
    console.log('Users:', users.recordset);
    
    const owner_id = users.recordset[0] ? users.recordset[0].user_id : null;
    if (owner_id) {
       const ownerNotifs = await p.request().query(`SELECT * FROM Notification WHERE user_id = ${owner_id} ORDER BY notification_id DESC`);
       console.log('Owner Notifications:', ownerNotifs.recordset);
    }

    const cars = await p.request().query("SELECT car_id, brand, model, owner_id FROM Vehicles WHERE model LIKE '%Vios%' OR model LIKE '%Corolla%'");
    console.log('Cars:', cars.recordset);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

test();
