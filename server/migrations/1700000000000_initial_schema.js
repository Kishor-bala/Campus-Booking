export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      location VARCHAR(100) NOT NULL,
      capacity INT NOT NULL CHECK (capacity > 0),
      rules TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE resource_slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      booking_date DATE NOT NULL,
      slot_index INT NOT NULL CHECK (slot_index BETWEEN 0 AND 7),
      is_open BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE(resource_id, booking_date, slot_index)
    );

    CREATE TABLE bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot_id UUID NOT NULL REFERENCES resource_slots(id) ON DELETE CASCADE,
      purpose VARCHAR(300) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cancelled_at TIMESTAMPTZ,
      cancelled_by UUID REFERENCES users(id),
      cancellation_reason VARCHAR(300)
    );

    CREATE UNIQUE INDEX one_confirmed_booking_per_slot
    ON bookings (slot_id)
    WHERE status = 'CONFIRMED';

    CREATE TABLE booking_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      actor_user_id UUID NOT NULL REFERENCES users(id),
      event_type VARCHAR(50) NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      details JSONB
    );

    CREATE TABLE "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);

    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

    CREATE INDEX "IDX_session_expire" ON "session" ("expire");
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS booking_events CASCADE;
    DROP TABLE IF EXISTS bookings CASCADE;
    DROP TABLE IF EXISTS resource_slots CASCADE;
    DROP TABLE IF EXISTS resources CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS "session" CASCADE;
  `);
};
