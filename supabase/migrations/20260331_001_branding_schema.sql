ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain) WHERE custom_domain IS NOT NULL;

UPDATE organizations SET subdomain = slug WHERE subdomain IS NULL;
