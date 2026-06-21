import { getPool, sql } from '../config/db.js';

async function fix() {
  try {
    const p = await getPool();
    const users = [
      {
        email: 'admin@bonboncar.vn',
        hash: '$2a$10$EaOh051/nmcvKXf4BHtNYe8qPdQOH2mORz9avGJJIi4RVgRkbKuWi'
      },
      {
        email: 'admin2@bonboncar.vn',
        hash: '$2a$10$INmJjkJg8ilvvQCAFdeGU.tQh8SLMYS1qSlsLyeNV7GEKHlKuxqB2'
      },
      {
        email: 'cskh@bonboncar.vn',
        hash: '$2a$10$o0ZbPrvV.3bkL4/nq48BRehg0WMd71SnSdwjfwpqLVs7ntM2UxC1i'
      }
    ];

    for (const u of users) {
      await p.request()
        .input('email', sql.VarChar, u.email)
        .input('hash', sql.NVarChar, u.hash)
        .query('UPDATE [User] SET password_hash = @hash WHERE email = @email');
      console.log('Successfully updated password hash for:', u.email);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error fixing password hashes:', err);
    process.exit(1);
  }
}

fix();
