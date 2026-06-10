import { db } from './database.js';

async function test() {
  try {
    console.log('Testing connection and seeding...');
    const users = await db.users.findMany();
    console.log('Successfully connected! Users found in SQL Server:', users.length);
    console.log('First user:', users[0] ? users[0].email : 'None');
    process.exit(0);
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
}

test();
