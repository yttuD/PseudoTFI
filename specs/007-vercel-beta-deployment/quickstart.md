# Validation and rollback guide

1. Confirm the dedicated Supabase project has 21/21 migrations and 136/136 pgTAP assertions, without resetting data.
2. Check Vercel API and web projects separately. Verify required variable **names and scopes**, not values; API service key must be secret and absent from web.
3. Confirm reviewed Git revision and deployment revision match. Run production builds and API tests before publishing.
4. From outside localhost, request API liveness/readiness and open web catalog. Repeat with missing-data/error cases; record status, time and URLs.
5. Set Supabase Auth site URL and allowlisted redirect URLs to actual web origin, then test real invited accounts for public, Gestor, Delegado and admin denial. Use Playwright to capture desktop and responsive views. Do not claim native Android validation.
6. If any security, money, auth or data-isolation gate fails, keep the URL restricted and do not invite testers.
7. Rollback: in each Vercel project's Deployments page, select the last known-good deployment and use Instant Rollback (or redeploy its recorded Git revision). Do not reset Supabase. Verify API readiness and public web after rollback.

Record actual outcomes in `evidence/deployment.md`; avoid copying tokens, secret values, cookies or real user data into evidence.
