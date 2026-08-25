-- Add interrupt support to trip_jobs
ALTER TABLE trip_jobs ADD COLUMN interrupted_reason TEXT;
ALTER TABLE trip_jobs ADD COLUMN interrupted_at TIMESTAMPTZ;
