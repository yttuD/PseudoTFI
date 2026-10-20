# Deployment decisions

- **Hosting**: Carlos chose Vercel for both Next.js web and NestJS API for this non-commercial beta. Railway is not used. Vercel documents NestJS auto-detection and a single Function runtime; no always-on worker is assumed.
- **Source**: Existing public `yttuD/PseudoTFI` repository; a reviewed `codex/rendo-beta-deploy` branch avoids silently publishing unrelated workspace files. A private repository was considered but Carlos chose the existing account/repository.
- **Data**: Dedicated Supabase beta project with migrated schema; no demo seed or real customer data. API service credential stays only in Vercel API environment.
- **Release state**: First URLs are restricted technical validation. Tester invitation depends on hosted role, security and visual evidence; URL creation alone is not acceptance.
