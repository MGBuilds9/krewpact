ALTER TABLE users ADD COLUMN IF NOT EXISTS adp_employee_code TEXT;
CREATE INDEX idx_users_adp_employee_code ON users(adp_employee_code) WHERE adp_employee_code IS NOT NULL;
