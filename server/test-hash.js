import bcrypt from 'bcryptjs';
import fs from 'fs';

const hash1 = '$2a$10$EaOh051/nmcvKXf4BHtNYe8qPdQOH2mORz9avGJJIi4RVgRkbKuWi'; // admin@bonboncar.vn
const hash2 = '$2a$10$INmJjkJg8ilvvQCAFdeGU.tQh8SLMYS1qSlsLyeNV7GEKHlKuxqB2'; // admin2@bonboncar.vn

async function check() {
  let log = '';
  const passwordsToTest = ['admin', 'admin2', '123456', 'Admin@123', 'admin123'];
  
  log += 'Testing Hash 1 (admin@bonboncar.vn):\n';
  for (const pw of passwordsToTest) {
    try {
      const match = await bcrypt.compare(pw, hash1);
      log += `  - "${pw}": ${match ? 'MATCH' : 'NO MATCH'}\n`;
    } catch (e) {
      log += `  - Error testing "${pw}": ${e.message}\n`;
    }
  }
  
  log += '\nTesting Hash 2 (admin2@bonboncar.vn):\n';
  for (const pw of passwordsToTest) {
    try {
      const match = await bcrypt.compare(pw, hash2);
      log += `  - "${pw}": ${match ? 'MATCH' : 'NO MATCH'}\n`;
    } catch (e) {
      log += `  - Error testing "${pw}": ${e.message}\n`;
    }
  }

  fs.writeFileSync('output.txt', log);
  console.log('Results written to output.txt');
}

check().catch(err => {
  fs.writeFileSync('output.txt', 'CRASHED: ' + err.stack);
});
