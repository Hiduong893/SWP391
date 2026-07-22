import { sql, getPool } from './server/config/db.js';

async function main() {
  try {
    const p = await getPool();
    
    // Find CarOwner user
    const res = await p.request().query("SELECT TOP 1 u.user_id, u.full_name FROM [User] u JOIN UserRole ur ON u.user_id = ur.user_id JOIN Role r ON ur.role_id = r.role_id WHERE r.role_name = 'CarOwner'");
    
    if (res.recordset.length === 0) {
      console.log("No CarOwner user found!");
      process.exit(1);
    }
    const ownerId = res.recordset[0].user_id;
    console.log(`Found CarOwner: ${res.recordset[0].full_name} (ID: ${ownerId})`);
    
    // Update all cars to be owned by this CarOwner
    const updateCars = await p.request().input('ownerId', sql.Int, ownerId).query(`
      UPDATE Vehicle SET owner_id = @ownerId
    `);
    console.log(`Updated ${updateCars.rowsAffected[0]} cars to be owned by CarOwner ${ownerId}.`);

    // Reset all car statuses to 'Available'
    const resetCars = await p.request().query(`
      UPDATE Vehicle SET status = 'Available' WHERE status IN ('Rented', 'Pending')
    `);
    console.log(`Reset ${resetCars.rowsAffected[0]} cars to 'Available' status.`);

    // Reset bookings to 'Completed' or 'Cancelled' so they are not active? 
    // The user said "các lịch sử cho thuê trước đó vẫn giữ nguyên, tôi chỉ muốn hiển thì lại toàn bộ danh sách xe trạng thái sẵn sàng để test"
    // Wait, if a car is 'Available', but there is an active Booking for it, it might cause issues?
    // If I just update the Vehicle table to 'Available', the My Trips might still show bookings.
    // The user said: "chuyển toàn bộ xe đang thuê hoặc đang chờ về lại trạng thái sẵn sàng cho thuê"
    // Let's also update any Booking that is 'Pending' or 'Active' to 'Completed' so they don't block?
    // Or I just update the Vehicle table. Let's do both to be safe.
    
    const resetBookings = await p.request().query(`
      UPDATE Booking SET status = 'Completed' WHERE status IN ('Pending', 'Approved', 'Active')
    `);
    console.log(`Set ${resetBookings.rowsAffected[0]} active/pending bookings to 'Completed'.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
