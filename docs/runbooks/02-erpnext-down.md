# ERPNext Down — ERP Screens Unreachable

**Severity:** P1
**Time to resolve:** 10–20 min
**Who can do this:** IT Admin (needs VM SSH access)

## Symptoms
- KrewPact screens that show ERPNext data say "ERPNext unreachable" or show blank/error panels
- https://erp.mdmgroupinc.ca is inaccessible or returns a 502 error
- Finance, procurement, and accounting screens affected (Pattern B screens)
- KrewPact-native screens (CRM, Projects, Inventory) still work fine

## Steps

1. **Confirm it is ERPNext and not Cloudflare**
   - Try https://erp.mdmgroupinc.ca from your browser
   - If you get a Cloudflare error page (orange/black), the tunnel may be down — skip to step 4
   - If the page just hangs or returns 502, the Docker containers are down — go to step 2

2. **SSH into the ERPNext VM**
   ```
   ssh mdm@192.168.128.21
   ```
   - Password: use the stored credential in IT password manager
   - If on an external network, you must be connected to Netbird VPN first

3. **Check Docker container status**
   ```bash
   cd /home/mdm/frappe-docker
   docker compose ps
   ```
   - All containers should show `Up`. If any show `Exited` or `Restarting`, proceed to step 4.

4. **Restart the Docker containers**
   ```bash
   docker compose restart
   ```
   - Wait 60–90 seconds for ERPNext to fully start
   - Check status again: `docker compose ps`

5. **If containers won't start, check logs**
   ```bash
   docker compose logs --tail=50 backend
   docker compose logs --tail=50 frontend
   ```
   - Copy any error messages and send to Michael Guirguis

6. **Verify ERPNext is back**
   - Open https://erp.mdmgroupinc.ca in a browser
   - You should see the ERPNext login page
   - In KrewPact, refresh a finance or procurement screen — data should load

7. **Check Cloudflare Tunnel (if step 2 failed)**
   - Log into https://dash.cloudflare.com → Zero Trust → Tunnels
   - Find the MDM tunnel — it should show "Healthy"
   - If degraded: click the tunnel → **Configure** → try restarting the connector

## Escalation
- Michael Guirguis if Docker refuses to start or logs show database corruption
- Cloudflare support if the tunnel remains degraded after restart
- Note: ERPNext VM is on Hyper-V host MDM-Server (100.81.237.43 via Netbird)
