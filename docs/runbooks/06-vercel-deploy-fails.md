# Vercel Deploy Fails

**Severity:** P2
**Time to resolve:** 15–45 min
**Who can do this:** Developer (or Platform Admin for env var fixes)

## Symptoms
- GitHub shows a red X on the latest commit to `main`
- Vercel dashboard shows a red "Error" deployment
- No new code reaches production — users stay on the previous version
- Vercel sends a deploy failure email notification

## Steps

1. **Open the failed deployment in Vercel**
   - Go to https://vercel.com/mdm-group/krewpact → Deployments
   - Click the red deployment → click **View Build Logs**

2. **Read the build log — find the first error**
   - Scroll to the BOTTOM of the log and work backward to find the first red error line
   - Common patterns and fixes:

   **TypeScript error:**
   ```
   Type error: Property 'X' does not exist on type 'Y'
   ```
   - A developer introduced a type error. The code must be fixed and re-pushed.
   - Do NOT try to "skip" TypeScript errors — they are enforced for safety.

   **Missing environment variable:**
   ```
   Error: Missing required environment variable: SOME_VAR
   ```
   - Go to Vercel → Project Settings → Environment Variables
   - Add the missing variable. Ask Michael Guirguis for the value — never guess.
   - After adding, trigger a redeploy: Deployments → latest commit → **Redeploy**

   **npm install / dependency error:**
   ```
   npm ERR! peer dep missing
   ```
   - A package conflict was introduced. The developer needs to fix `package.json` and `package-lock.json`.

   **Build memory/timeout:**
   ```
   Error: The build exceeded the memory limit
   ```
   - Contact Michael Guirguis — this needs a Vercel plan or build config change.

   **ESLint error:**
   ```
   Error: X problems (X errors, X warnings)
   ```
   - A developer pushed code that fails the linter. Must be fixed in code.

3. **Trigger a redeploy after an env var fix**
   - Deployments → failed deployment → **Redeploy**
   - Watch the build log in real time (click "View build logs" on the new deployment)

4. **If you cannot fix it, keep users on the current production version**
   - The previous deployment is still live — users are not affected
   - There is no urgency to force a broken build through

5. **Verify the fix**
   - A green checkmark appears in Vercel and on the GitHub commit
   - Check https://krewpact.ca loads normally

## Escalation
- Michael Guirguis for TypeScript/lint errors (requires a code fix)
- Vercel support for build infrastructure issues: https://vercel.com/support
