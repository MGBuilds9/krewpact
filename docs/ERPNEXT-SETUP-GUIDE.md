# ERPNext Setup Guide for KrewPact Integration

**For:** Michael, on the ERPNext server
**Time:** ~30 minutes
**Prereqs:** ERPNext running, SSH access, Cloudflare account

---

## Step 1: Verify ERPNext is Running

```bash
# On the ERPNext server
bench --site [your-site-name] doctor
# Should show site is up. If you don't know the site name:
ls sites/
# Look for the folder that ISN'T "assets" or "common_site_config.json"
```

## Step 2: Create a KrewPact API User

```bash
bench --site [your-site-name] console
```

In the console:
```python
import frappe

# Create the API user
user = frappe.get_doc({
    "doctype": "User",
    "email": "krewpact-api@mdmgroupinc.ca",
    "first_name": "KrewPact",
    "last_name": "API",
    "enabled": 1,
    "user_type": "System User",
    "send_welcome_email": 0
})
user.insert(ignore_permissions=True)
frappe.db.commit()
print("User created:", user.name)
```

Then assign roles (still in console):
```python
roles_needed = [
    "Sales User", "Sales Manager",
    "Projects User", "Projects Manager",
    "Accounts User",
    "Purchase User",
    "HR User",
    "System Manager"  # needed for custom field creation
]

for role in roles_needed:
    user.append("roles", {"role": role})
user.save(ignore_permissions=True)
frappe.db.commit()
print("Roles assigned")
```

## Step 3: Generate API Keys

Still in the bench console:
```python
user = frappe.get_doc("User", "krewpact-api@mdmgroupinc.ca")
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)

user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()

print(f"API Key:    {api_key}")
print(f"API Secret: {api_secret}")
print(f"\nSave these! You need them for KrewPact .env")
print(f"ERPNEXT_API_KEY={api_key}")
print(f"ERPNEXT_API_SECRET={api_secret}")
```

**SAVE THE OUTPUT.** You'll need both values for KrewPact's `.env.local`.

Exit the console: `exit()`

## Step 4: Test the API Locally

```bash
# Replace with your actual values
API_KEY="your-key-from-above"
API_SECRET="your-secret-from-above"
SITE="your-site-name"

# Test from the ERPNext server itself
curl -s -H "Authorization: token ${API_KEY}:${API_SECRET}" \
  "http://localhost:8000/api/resource/Company" | python3 -m json.tool | head -20
```

You should see your company data. If you get `403`, the user roles are wrong.

## Step 5: Install Cloudflare Tunnel

```bash
# Install cloudflared
# Debian/Ubuntu:
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# Or if Docker:
# docker pull cloudflare/cloudflared:latest
```

## Step 6: Authenticate with Cloudflare

```bash
cloudflared tunnel login
# This opens a browser URL. Log in to Cloudflare, authorize the domain.
```

## Step 7: Create the Tunnel

```bash
cloudflared tunnel create krewpact-erp
# Output: Created tunnel krewpact-erp with id <TUNNEL_ID>
# Save the tunnel ID
```

## Step 8: Configure the Tunnel

```bash
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: erp-api.krewpact.com
    service: http://localhost:8000
  - service: http_status:404
EOF
```

Replace `<TUNNEL_ID>` with your actual tunnel ID from Step 7.

## Step 9: Create DNS Route

```bash
cloudflared tunnel route dns krewpact-erp erp-api.krewpact.com
```

This creates a CNAME record in Cloudflare DNS pointing `erp-api.krewpact.com` to your tunnel.

## Step 10: Start the Tunnel

```bash
# Test it first:
cloudflared tunnel run krewpact-erp

# If it works, install as a systemd service:
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Step 11: Verify External Access

From your Mac (not the ERPNext server):

```bash
curl -s -H "Authorization: token YOUR_KEY:YOUR_SECRET" \
  "https://erp-api.krewpact.com/api/resource/Company" | python3 -m json.tool | head -20
```

If you see company data, the tunnel is working.

## Step 12: Add Custom Fields for KrewPact

Back on the ERPNext server, in bench console:

```bash
bench --site [your-site-name] console
```

```python
import frappe

custom_fields = [
    # Customer
    {"dt": "Customer", "fieldname": "custom_mdm_account_id", "fieldtype": "Data", "label": "KrewPact Account ID", "read_only": 1, "no_copy": 1},
    {"dt": "Customer", "fieldname": "custom_division", "fieldtype": "Data", "label": "Division", "read_only": 1},
    # Contact
    {"dt": "Contact", "fieldname": "custom_mdm_contact_id", "fieldtype": "Data", "label": "KrewPact Contact ID", "read_only": 1, "no_copy": 1},
    # Opportunity
    {"dt": "Opportunity", "fieldname": "custom_mdm_opportunity_id", "fieldtype": "Data", "label": "KrewPact Opportunity ID", "read_only": 1, "no_copy": 1},
    # Quotation
    {"dt": "Quotation", "fieldname": "custom_mdm_estimate_id", "fieldtype": "Data", "label": "KrewPact Estimate ID", "read_only": 1, "no_copy": 1},
    {"dt": "Quotation", "fieldname": "custom_mdm_estimate_version", "fieldtype": "Int", "label": "Estimate Version", "read_only": 1},
    # Sales Order
    {"dt": "Sales Order", "fieldname": "custom_mdm_contract_id", "fieldtype": "Data", "label": "KrewPact Contract ID", "read_only": 1, "no_copy": 1},
    {"dt": "Sales Order", "fieldname": "custom_boldsign_envelope_id", "fieldtype": "Data", "label": "BoldSign Envelope ID", "read_only": 1},
    {"dt": "Sales Order", "fieldname": "custom_allowance_total", "fieldtype": "Currency", "label": "Allowance Total"},
    # Project
    {"dt": "Project", "fieldname": "custom_mdm_project_id", "fieldtype": "Data", "label": "KrewPact Project ID", "read_only": 1, "no_copy": 1},
    # Task
    {"dt": "Task", "fieldname": "custom_mdm_task_id", "fieldtype": "Data", "label": "KrewPact Task ID", "read_only": 1, "no_copy": 1},
    # Expense Claim
    {"dt": "Expense Claim", "fieldname": "custom_mdm_expense_claim_id", "fieldtype": "Data", "label": "KrewPact Expense ID", "read_only": 1, "no_copy": 1},
    # Timesheet
    {"dt": "Timesheet", "fieldname": "custom_mdm_timesheet_batch_id", "fieldtype": "Data", "label": "KrewPact Timesheet Batch ID", "read_only": 1, "no_copy": 1},
    # Sales Invoice
    {"dt": "Sales Invoice", "fieldname": "custom_mdm_project_id", "fieldtype": "Data", "label": "KrewPact Project ID", "read_only": 1},
    # Purchase Invoice
    {"dt": "Purchase Invoice", "fieldname": "custom_mdm_project_id", "fieldtype": "Data", "label": "KrewPact Project ID", "read_only": 1},
]

for cf in custom_fields:
    if not frappe.db.exists("Custom Field", {"dt": cf["dt"], "fieldname": cf["fieldname"]}):
        doc = frappe.get_doc({
            "doctype": "Custom Field",
            "insert_after": "",  # appends to end
            **cf
        })
        doc.insert(ignore_permissions=True)
        print(f"Created: {cf['dt']}.{cf['fieldname']}")
    else:
        print(f"Already exists: {cf['dt']}.{cf['fieldname']}")

frappe.db.commit()
print("\nAll custom fields created!")
```

## Step 13: Set KrewPact Environment Variables

On your Mac, in the KrewPact project, add to `.env.local`:

```bash
ERPNEXT_BASE_URL=https://erp-api.krewpact.com
ERPNEXT_API_KEY=<from step 3>
ERPNEXT_API_SECRET=<from step 3>
```

Also add to Vercel environment variables for production.

## Step 14: Seed MDM Company Data in ERPNext

In bench console, create the company and divisions if they don't exist:

```python
import frappe

# Check if company exists
if not frappe.db.exists("Company", "MDM Group Inc."):
    company = frappe.get_doc({
        "doctype": "Company",
        "company_name": "MDM Group Inc.",
        "abbr": "MDM",
        "default_currency": "CAD",
        "country": "Canada",
        "domain": "Construction"
    })
    company.insert(ignore_permissions=True)
    frappe.db.commit()
    print("Company created")
else:
    print("Company already exists")
```

---

## Verification Checklist

Run these from your Mac after all steps:

```bash
# 1. Health check
curl -s "https://erp-api.krewpact.com/api/method/ping"
# Expected: {"message": "pong"}

# 2. Auth check
curl -s -H "Authorization: token KEY:SECRET" \
  "https://erp-api.krewpact.com/api/resource/Company/MDM Group Inc." \
  | python3 -m json.tool | head -5

# 3. Custom fields check
curl -s -H "Authorization: token KEY:SECRET" \
  "https://erp-api.krewpact.com/api/resource/Custom Field?filters=[[\"fieldname\",\"like\",\"custom_mdm%\"]]&fields=[\"name\",\"dt\",\"fieldname\"]" \
  | python3 -m json.tool

# 4. KrewPact connection test
cd /path/to/krewpact
npm run dev
# Then in another terminal:
curl -s "http://localhost:3000/api/erp/sync" | python3 -m json.tool
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `403 Forbidden` on API calls | User doesn't have the right roles. Re-run Step 2 role assignment. |
| Tunnel won't start | Check `~/.cloudflared/config.yml` has correct tunnel ID. Run `cloudflared tunnel list` to verify. |
| `erp-api.krewpact.com` doesn't resolve | DNS propagation. Wait 5 min. Check `cloudflared tunnel route dns` output. |
| Custom fields not showing in API responses | Clear cache: `bench --site [site] clear-cache` |
| `ERPNEXT_BASE_URL` not working in KrewPact | Make sure the URL has no trailing slash. Should be `https://erp-api.krewpact.com` |
