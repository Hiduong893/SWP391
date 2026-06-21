import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const masterConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa',
  server: process.env.DB_SERVER || 'localhost',
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 30000,
};

const appConfig = {
  ...masterConfig,
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
};

async function executeQueries(pool, queries) {
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    if (/^\s*use\s+/i.test(query)) {
      console.log(`Skipping USE statement: ${query.split('\n')[0].trim()}`);
      continue;
    }
    if (/^\s*create\s+database\s+/i.test(query)) {
      console.log(`Skipping CREATE DATABASE statement...`);
      continue;
    }
    try {
      await pool.request().query(query);
    } catch (err) {
      console.error(`Error executing query block ${i + 1}:`);
      console.error(query.substring(0, 300) + '...');
      console.error('Error message:', err.message);
      throw err;
    }
  }
}

async function run() {
  console.log('=== STARTING DATABASE RESET ===');
  
  // 1. Connect to master to drop and recreate CarRentalPlatform
  let pool;
  try {
    console.log('Connecting to master database...');
    pool = await sql.connect(masterConfig);
    
    console.log('Dropping database CarRentalPlatform if exists...');
    const dropQuery = `
      IF EXISTS (SELECT name FROM sys.databases WHERE name = 'CarRentalPlatform')
      BEGIN
          ALTER DATABASE CarRentalPlatform SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
          DROP DATABASE CarRentalPlatform;
      END
    `;
    await pool.request().query(dropQuery);
    console.log('Database dropped successfully.');
    
    console.log('Creating database CarRentalPlatform...');
    const createQuery = `CREATE DATABASE CarRentalPlatform COLLATE Vietnamese_CI_AS;`;
    await pool.request().query(createQuery);
    console.log('Database created successfully.');
    
    await pool.close();
  } catch (err) {
    console.error('Error during database recreate on master:', err.message);
    if (pool) {
      try { await pool.close(); } catch (_) {}
    }
    process.exit(1);
  }
  
  // 2. Connect to the newly created CarRentalPlatform database
  try {
    console.log('Connecting to CarRentalPlatform database...');
    pool = await sql.connect(appConfig);
    
    // 3. Read and execute Sql_CarRentalPlatform.sql
    console.log('Reading Sql_CarRentalPlatform.sql...');
    const schemaFile = path.resolve(__dirname, '../Sql_CarRentalPlatform.sql');
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    
    // Split by GO statements
    const schemaQueries = schemaSql
      .split(/\r?\n\s*[gG][oO]\s*\r?\n/)
      .map(q => q.trim())
      .filter(q => q.length > 0);
      
    console.log(`Executing schema script (${schemaQueries.length} blocks)...`);
    await executeQueries(pool, schemaQueries);
    console.log('Schema created successfully.');
    
    // 4. Read and execute Insert_Data_Car.sql
    console.log('Reading Insert_Data_Car.sql...');
    const seedFile = path.resolve(__dirname, '../Insert_Data_Car.sql');
    const seedSql = fs.readFileSync(seedFile, 'utf8');
    
    const seedQueries = seedSql
      .split(/\r?\n\s*[gG][oO]\s*\r?\n/)
      .map(q => q.trim())
      .filter(q => q.length > 0);
      
    console.log(`Executing seed script (${seedQueries.length} blocks)...`);
    await executeQueries(pool, seedQueries);
    console.log('Database seed data inserted successfully.');
    
    console.log('=== DATABASE RESET COMPLETED SUCCESSFULLY! ===');
    await pool.close();
  } catch (err) {
    console.error('Error during database initialization:', err);
    if (pool) {
      try { await pool.close(); } catch (_) {}
    }
    process.exit(1);
  }
}

run();
