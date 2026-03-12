-- Add AI preferences column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}';
