import { db } from './database.js';

async function test() {
  try {
    const cars = await db.cars.findMany({ status: 'available' });
    const hanoiCar = cars.find(c => c.location.includes('Nội') || c.location.includes('Hà'));
    
    if (!hanoiCar) {
      console.log('No Hanoi car found in DB!');
      process.exit(1);
    }

    const dbLoc = hanoiCar.location;
    const jsLoc = 'Hà Nội';

    console.log(`DB Location string: "${dbLoc}"`);
    console.log(`JS Location string: "${jsLoc}"`);
    console.log(`Direct equal: ${dbLoc === jsLoc}`);
    console.log(`NFC normalized equal: ${dbLoc.normalize('NFC') === jsLoc.normalize('NFC')}`);
    console.log(`NFD normalized equal: ${dbLoc.normalize('NFD') === jsLoc.normalize('NFD')}`);

    console.log('\nDB Char Codes:');
    for (let i = 0; i < dbLoc.length; i++) {
      console.log(`  char[${i}]: ${dbLoc[i]} (code: ${dbLoc.charCodeAt(i)})`);
    }

    console.log('\nJS Char Codes:');
    for (let i = 0; i < jsLoc.length; i++) {
      console.log(`  char[${i}]: ${jsLoc[i]} (code: ${jsLoc.charCodeAt(i)})`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
