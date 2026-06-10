import { db } from './database.js';

async function test() {
  try {
    console.log('Fetching users to trigger database connection & migration...');
    const users = await db.users.findMany();
    console.log('Users in database:');
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
    });
  } catch (error) {
    console.error('Error running update test:', error);
  }
  process.exit(0);
}

test();
