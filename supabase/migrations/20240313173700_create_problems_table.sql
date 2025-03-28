-- Migration: Create Problems Table (20240313173700)

-- Add new columns to problems table
ALTER TABLE problems
    ADD COLUMN version INTEGER,
    ADD COLUMN solution JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN prompt JSONB NOT NULL DEFAULT '{}'
-- Update repository_contents to use TEXT instead of JSONB
ALTER TABLE problems 
    ALTER COLUMN repository_contents TYPE TEXT USING repository_contents::text
-- Add enum for status
CREATE TYPE problem_status AS ENUM ('Solved', 'Unsolved')
-- Update status to use enum (need to handle existing values)
UPDATE problems SET status = 'Unsolved' WHERE status NOT IN ('Solved', 'Unsolved')
ALTER TABLE problems 
    ALTER COLUMN status TYPE problem_status USING status::problem_status
-- Down
ALTER TABLE problems
    DROP COLUMN version,
    DROP COLUMN solution,
    DROP COLUMN prompt
ALTER TABLE problems 
    ALTER COLUMN repository_contents TYPE JSONB USING repository_contents::jsonb
ALTER TABLE problems 
    ALTER COLUMN status TYPE TEXT
DROP TYPE IF EXISTS problem_status
