import { db } from './database.js';

async function test() {
  try {
    console.log('Querying TP. Hồ Chí Minh...');
    const tphcm = await db.cars.findMany({ location: 'TP. Hồ Chí Minh' });
    console.log(`TP. Hồ Chí Minh returned ${tphcm.length} cars`);
    console.log(tphcm.map(c => ({ id: c.id, model: c.model, location: c.location })));

    console.log('\nQuerying Hà Nội...');
    const hanoi = await db.cars.findMany({ location: 'Hà Nội' });
    console.log(`Hà Nội returned ${hanoi.length} cars`);
    console.log(hanoi.map(c => ({ id: c.id, model: c.model, location: c.location })));

    console.log('\nQuerying Đà Nẵng...');
    const danang = await db.cars.findMany({ location: 'Đà Nẵng' });
    console.log(`Đà Nẵng returned ${danang.length} cars`);
    console.log(danang.map(c => ({ id: c.id, model: c.model, location: c.location })));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

test();
