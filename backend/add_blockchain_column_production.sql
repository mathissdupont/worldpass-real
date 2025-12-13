-- Add blockchain_chain column to production database
-- Run this on the server

ALTER TABLE issued_vcs ADD COLUMN blockchain_chain TEXT DEFAULT 'polygon';

-- Verify the column was added
PRAGMA table_info(issued_vcs);
