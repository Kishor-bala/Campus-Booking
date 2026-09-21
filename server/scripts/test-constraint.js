import { pool } from '../src/db/index.js';

const testConstraint = async () => {
  const client = await pool.connect();
  try {
    const userRes = await client.query('SELECT id FROM users LIMIT 1');
    const slotRes = await client.query('SELECT id FROM resource_slots LIMIT 1');
    
    const userId = userRes.rows[0].id;
    const slotId = slotRes.rows[0].id;

    console.log('1. Inserting first CONFIRMED booking...');
    await client.query(
      'INSERT INTO bookings (user_id, slot_id, purpose, status) VALUES ($1, $2, $3, $4)',
      [userId, slotId, 'First booking test purpose', 'CONFIRMED']
    );
    console.log('   First CONFIRMED booking inserted successfully.');

    console.log('2. Attempting second CONFIRMED booking for same slot_id...');
    try {
      await client.query(
        'INSERT INTO bookings (user_id, slot_id, purpose, status) VALUES ($1, $2, $3, $4)',
        [userId, slotId, 'Second booking test purpose', 'CONFIRMED']
      );
      console.error('FAILED: Second booking inserted unexpectedly without error!');
    } catch (err) {
      console.log('   SUCCESS: Second booking rejected by database!');
      console.log('   Error Code:', err.code);
      console.log('   Violated Constraint:', err.constraint);
      console.log('   Error Detail:', err.detail);
    }
  } finally {
    await client.query('DELETE FROM bookings');
    client.release();
    await pool.end();
  }
};

testConstraint();
