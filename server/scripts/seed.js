import argon2 from 'argon2';
import { pool } from '../src/db/index.js';
import { logger } from '../src/config/logger.js';

const seed = async () => {
  logger.info('Starting database seed execution...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Accounts (Admin & Students)
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'kishorbala003@gmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'login123';
    const adminHash = await argon2.hash(adminPassword);
    const studentPasswordHash = await argon2.hash('StudentPassword123!');

    const usersData = [
      { name: 'Campus Admin', email: adminEmail, passwordHash: adminHash, role: 'ADMIN' },
      { name: 'Alice Student', email: 'student1@jit.ac.in', passwordHash: studentPasswordHash, role: 'STUDENT' },
      { name: 'Bob Student', email: 'student2@jit.ac.in', passwordHash: studentPasswordHash, role: 'STUDENT' },
    ];

    for (const u of usersData) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
        [u.name, u.email, u.passwordHash, u.role]
      );
    }
    logger.info(`Seeded users (Admin: ${adminEmail}, Students: student1@jit.ac.in, student2@jit.ac.in).`);

    // 2. Seed 6 Resources
    const resourcesData = [
      {
        name: 'Study Room A',
        category: 'Study Room',
        description: 'Quiet group study room equipped with a whiteboard and HDMI display.',
        location: 'Library 2nd Floor, Room 201',
        capacity: 6,
        rules: 'No eating inside. Leave room clean.',
      },
      {
        name: 'Study Room B',
        category: 'Study Room',
        description: 'Small discussion room ideal for group projects.',
        location: 'Library 2nd Floor, Room 202',
        capacity: 4,
        rules: 'Keep volume at reasonable level.',
      },
      {
        name: '4K Projector 1',
        category: 'Equipment',
        description: 'Portable high-definition projector with HDMI/USB-C adapters.',
        location: 'AV Counter, Main Academic Building',
        capacity: 1,
        rules: 'Return immediately after slot ends.',
      },
      {
        name: '4K Projector 2',
        category: 'Equipment',
        description: 'High-brightness overhead projector for classroom presentations.',
        location: 'AV Counter, Main Academic Building',
        capacity: 1,
        rules: 'Handle cables with care.',
      },
      {
        name: 'AI Workstation 1',
        category: 'Laboratory',
        description: 'High-performance GPU workstation loaded with PyTorch & CUDA.',
        location: 'Computer Lab 3, Desk 12',
        capacity: 1,
        rules: 'Academic research use only.',
      },
      {
        name: 'Badminton Court 1',
        category: 'Sports',
        description: 'Indoor wooden badminton court with net.',
        location: 'Campus Sports Complex',
        capacity: 4,
        rules: 'Non-marking sports shoes mandatory.',
      },
    ];

    const resourceIds = [];
    for (const r of resourcesData) {
      const res = await client.query(
        `SELECT id FROM resources WHERE name = $1`,
        [r.name]
      );
      if (res.rows.length > 0) {
        resourceIds.push(res.rows[0].id);
      } else {
        const insertRes = await client.query(
          `INSERT INTO resources (name, category, description, location, capacity, rules, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           RETURNING id`,
          [r.name, r.category, r.description, r.location, r.capacity, r.rules]
        );
        resourceIds.push(insertRes.rows[0].id);
      }
    }
    logger.info(`Seeded ${resourceIds.length} resources.`);

    // 3. Seed Canonical Slots for 14 Days (today through +13 days)
    const today = new Date();
    let slotCount = 0;

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      for (const resourceId of resourceIds) {
        for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
          await client.query(
            `INSERT INTO resource_slots (resource_id, booking_date, slot_index, is_open)
             VALUES ($1, $2, $3, TRUE)
             ON CONFLICT (resource_id, booking_date, slot_index) DO NOTHING`,
            [resourceId, dateStr, slotIndex]
          );
          slotCount++;
        }
      }
    }
    logger.info(`Seeded canonical slots for 14 dates (${slotCount} slot records checked/inserted).`);

    await client.query('COMMIT');
    logger.info('Database seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Error during database seed');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
