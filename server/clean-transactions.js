import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const appConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 30000,
};

async function run() {
  console.log('=== CLEANING TRANSACTION & BOOKING DATA ===');
  let pool;
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(appConfig);
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      console.log('Deleting transaction data tables (in correct foreign key order)...');
      
      // Delete child and dependent tables first
      await transaction.request().query('DELETE FROM TicketMessage;');
      await transaction.request().query('DELETE FROM SupportTicket;');
      await transaction.request().query('DELETE FROM ComplaintEvidence;');
      await transaction.request().query('DELETE FROM Complaint;');
      await transaction.request().query('DELETE FROM IncidentImage;');
      await transaction.request().query('DELETE FROM Incident;');
      await transaction.request().query('DELETE FROM Review;');
      await transaction.request().query('DELETE FROM WalletTransaction;');
      await transaction.request().query('DELETE FROM Payment;');
      await transaction.request().query('DELETE FROM HandoverImage;');
      await transaction.request().query('DELETE FROM BookingHandover;');
      await transaction.request().query('DELETE FROM Booking;');
      await transaction.request().query('DELETE FROM Notification;');
      await transaction.request().query('DELETE FROM KYC;');
      
      // Reset wallet balances to 0
      console.log('Resetting wallet balances to 0...');
      await transaction.request().query('UPDATE Wallet SET balance = 0, is_bank_verified = 0;');
      
      await transaction.commit();
      console.log('=== TRANSACTION DATA CLEANED SUCCESSFULLY! ===');
    } catch (err) {
      console.error('Error during transaction execution, rolling back...', err.message);
      await transaction.rollback();
      throw err;
    }
    
    await pool.close();
  } catch (err) {
    console.error('Failed to clean transaction data:', err.message);
    if (pool) {
      try { await pool.close(); } catch (_) {}
    }
    process.exit(1);
  }
}

run();
