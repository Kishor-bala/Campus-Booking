import { z } from 'zod';
import { pool } from '../db/index.js';

const resourceSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  description: z.string().min(5),
  location: z.string().min(2).max(100),
  capacity: z.number().int().positive(),
  rules: z.string().min(5),
});

const generateSlotsSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Calculate IST slot timestamps
const getSlotTimestamps = (bookingDateStr, slotIndex) => {
  const startHour = 9 + slotIndex;
  const endHour = startHour + 1;

  const pad = (n) => String(n).padStart(2, '0');
  const startsAt = `${bookingDateStr}T${pad(startHour)}:00:00+05:30`;
  const endsAt = `${bookingDateStr}T${pad(endHour)}:00:00+05:30`;

  return { startsAt, endsAt };
};

// 1. Student List Active Resources
export const listResources = async (req, res, next) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const category = req.query.category ? req.query.category.trim() : null;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];

    if (search) {
      queryParams.push(search);
      whereConditions.push(`(name ILIKE $${queryParams.length} OR location ILIKE $${queryParams.length})`);
    }

    if (category) {
      queryParams.push(category);
      whereConditions.push(`category = $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*) FROM resources WHERE ${whereClause}`, queryParams);
    const totalItems = parseInt(countRes.rows[0].count, 10);

    queryParams.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT id, name, category, description, location, capacity, rules, is_active, created_at
       FROM resources
       WHERE ${whereClause}
       ORDER BY name ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return res.status(200).json({
      data: dataRes.rows,
      pagination: {
        totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// 2. Student Get Single Active Resource
export const getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, category, description, location, capacity, rules, is_active, created_at FROM resources WHERE id = $1 AND is_active = TRUE',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found or inactive',
        },
      });
    }

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 3. Student Get Slots for Resource and Date
export const getResourceSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dateStr = req.query.date;

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter date (YYYY-MM-DD) is required',
        },
      });
    }

    const slotsRes = await pool.query(
      `SELECT s.id, s.resource_id, s.booking_date, s.slot_index, s.is_open,
              b.id AS booking_id, b.status AS booking_status, b.user_id AS booked_by
       FROM resource_slots s
       LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'CONFIRMED'
       WHERE s.resource_id = $1 AND s.booking_date = $2
       ORDER BY s.slot_index ASC`,
      [id, dateStr]
    );

    const nowIso = new Date().toISOString();

    const formattedSlots = slotsRes.rows.map((slot) => {
      const { startsAt, endsAt } = getSlotTimestamps(dateStr, slot.slot_index);
      
      let state = 'available';
      if (!slot.is_open) {
        state = 'closed';
      } else if (slot.booking_status === 'CONFIRMED') {
        state = 'booked';
      } else if (new Date(startsAt) < new Date()) {
        state = 'past';
      }

      return {
        id: slot.id,
        resourceId: slot.resource_id,
        bookingDate: slot.booking_date,
        slotIndex: slot.slot_index,
        isOpen: slot.is_open,
        startsAt,
        endsAt,
        state,
        bookingId: slot.booking_id || null,
      };
    });

    return res.status(200).json({ data: formattedSlots });
  } catch (err) {
    next(err);
  }
};

// 4. Admin List All Resources (including inactive)
export const adminListResources = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, category, description, location, capacity, rules, is_active, created_at FROM resources ORDER BY created_at DESC'
    );
    return res.status(200).json({ data: result.rows });
  } catch (err) {
    next(err);
  }
};

// 5. Admin Create Resource
export const adminCreateResource = async (req, res, next) => {
  try {
    const parseResult = resourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid resource attributes',
          details: parseResult.error.errors,
        },
      });
    }

    const { name, category, description, location, capacity, rules } = parseResult.data;

    const result = await pool.query(
      `INSERT INTO resources (name, category, description, location, capacity, rules, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, name, category, description, location, capacity, rules, is_active, created_at`,
      [name.trim(), category.trim(), description.trim(), location.trim(), capacity, rules.trim()]
    );

    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 6. Admin Edit or Deactivate Resource (Policy Enforcement)
export const adminUpdateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, description, location, capacity, rules, isActive } = req.body;

    // Check if resource exists
    const existingRes = await pool.query('SELECT * FROM resources WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found' },
      });
    }

    // Policy Enforcement: If deactivating resource, check for active unended CONFIRMED bookings
    if (isActive === false) {
      const activeBookingCheck = await pool.query(
        `SELECT b.id
         FROM bookings b
         JOIN resource_slots s ON s.id = b.slot_id
         WHERE s.resource_id = $1
           AND b.status = 'CONFIRMED'
           AND (s.booking_date + TIME '09:00' + (s.slot_index + 1) * INTERVAL '1 hour') AT TIME ZONE 'Asia/Kolkata' > CURRENT_TIMESTAMP`,
        [id]
      );

      if (activeBookingCheck.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: 'RESOURCE_HAS_ACTIVE_BOOKINGS',
            message: 'Cannot deactivate resource with outstanding confirmed bookings. Cancel affected bookings first.',
          },
        });
      }
    }

    const updatedName = name !== undefined ? name.trim() : existingRes.rows[0].name;
    const updatedCategory = category !== undefined ? category.trim() : existingRes.rows[0].category;
    const updatedDesc = description !== undefined ? description.trim() : existingRes.rows[0].description;
    const updatedLocation = location !== undefined ? location.trim() : existingRes.rows[0].location;
    const updatedCapacity = capacity !== undefined ? capacity : existingRes.rows[0].capacity;
    const updatedRules = rules !== undefined ? rules.trim() : existingRes.rows[0].rules;
    const updatedActive = isActive !== undefined ? Boolean(isActive) : existingRes.rows[0].is_active;

    const result = await pool.query(
      `UPDATE resources
       SET name = $1, category = $2, description = $3, location = $4, capacity = $5, rules = $6, is_active = $7
       WHERE id = $8
       RETURNING id, name, category, description, location, capacity, rules, is_active, created_at`,
      [updatedName, updatedCategory, updatedDesc, updatedLocation, updatedCapacity, updatedRules, updatedActive, id]
    );

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 7. Admin Idempotent Slot Generation
export const adminGenerateSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = generateSlotsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'fromDate and toDate (YYYY-MM-DD) are required' },
      });
    }

    const { fromDate, toDate } = parseResult.data;
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    if (startDate > endDate) {
      return res.status(400).json({
        error: { code: 'INVALID_DATE_RANGE', message: 'fromDate must be before or equal to toDate' },
      });
    }

    let generatedCount = 0;
    const curr = new Date(startDate);

    while (curr <= endDate) {
      const dateStr = curr.toISOString().split('T')[0];
      for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
        await pool.query(
          `INSERT INTO resource_slots (resource_id, booking_date, slot_index, is_open)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (resource_id, booking_date, slot_index) DO NOTHING`,
          [id, dateStr, slotIndex]
        );
        generatedCount++;
      }
      curr.setDate(curr.getDate() + 1);
    }

    return res.status(200).json({
      data: {
        message: 'Slots generated successfully',
        resourceId: id,
        fromDate,
        toDate,
        totalSlotsEvaluated: generatedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 8. Admin Update Slot Open/Closed Status (Policy Enforcement)
export const adminUpdateSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isOpen } = req.body;

    if (isOpen === undefined) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'isOpen boolean field is required' },
      });
    }

    // Policy Enforcement: Reject slot closure if active unended CONFIRMED booking exists
    if (isOpen === false) {
      const activeBookingCheck = await pool.query(
        `SELECT b.id
         FROM bookings b
         JOIN resource_slots s ON s.id = b.slot_id
         WHERE s.id = $1
           AND b.status = 'CONFIRMED'
           AND (s.booking_date + TIME '09:00' + (s.slot_index + 1) * INTERVAL '1 hour') AT TIME ZONE 'Asia/Kolkata' > CURRENT_TIMESTAMP`,
        [id]
      );

      if (activeBookingCheck.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: 'SLOT_HAS_ACTIVE_BOOKING',
            message: 'Cannot close slot with an outstanding confirmed booking. Cancel the booking first.',
          },
        });
      }
    }

    const result = await pool.query(
      `UPDATE resource_slots SET is_open = $1 WHERE id = $2 RETURNING id, resource_id, booking_date, slot_index, is_open`,
      [Boolean(isOpen), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'SLOT_NOT_FOUND', message: 'Slot not found' },
      });
    }

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
