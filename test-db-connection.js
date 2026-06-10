import sql from 'mssql';

const servers = ['localhost', '.', 'DESKTOP-DF1VL3V', 'GHUY-LAP'];

for (const server of servers) {
  const config = {
    user: 'sa',
    password: 'sa',
    server: server,
    database: 'CarRentalPlatform',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 3000,
  };

  try {
    console.log(`Trying to connect to server: ${server}...`);
    const pool = await sql.connect(config);
    console.log(`Successfully connected to ${server}!`);
    await pool.close();
    break;
  } catch (e) {
    console.error(`Failed to connect to ${server}:`, e.message);
  }
}
process.exit(0);
