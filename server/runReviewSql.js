import { getPool } from './config/db.js';
import fs from 'fs';

getPool().then(async p => {
  try {
    let sqlScript = fs.readFileSync('../review.sql', 'utf8');
    sqlScript = sqlScript.replace(/^GO$/gm, '');
    sqlScript = sqlScript.replace(/^USE CarRentalPlatform;$/gm, '');
    
    // Fix the loop range
    sqlScript = sqlScript.replace('DECLARE @current_vehicle_id INT = 3;', 'DECLARE @current_vehicle_id INT = 1002;');
    sqlScript = sqlScript.replace('WHILE @current_vehicle_id <= 33', 'WHILE @current_vehicle_id <= 1034');

    // Add is_visible to the script
    sqlScript = sqlScript.replace(
      'rating_owner, comment, created_at, updated_at', 
      'rating_owner, comment, is_visible, created_at, updated_at'
    );
    sqlScript = sqlScript.replace(
      '@rating_owner, @comment, GETDATE(), GETDATE()', 
      '@rating_owner, @comment, 1, GETDATE(), GETDATE()'
    );

    const res = await p.request().query(sqlScript);
    console.log("Script executed successfully. Records added.");
  } catch (err) {
    console.error("Error executing script:", err.message);
  } finally {
    process.exit(0);
  }
});
