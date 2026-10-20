# Excluded Artifacts Classification

## Overview
This classification distinguishes active source code from generated outputs, build caches, scratch directories, and external assets that are excluded from the primary audit denominator.

## Excluded Categories

### 1. Build and Compilation Outputs
- `apps/web/.next/**`: Next.js production/dev build bundles and cache.
- `apps/api/dist/**`: NestJS compiled JavaScript output.
- `apps/api/tsconfig.build.tsbuildinfo`: TypeScript incremental build cache.
- `packages/*/dist/**`: Compiled shared package output.
- `node_modules/**` and `*/node_modules/**`: External package dependencies.
- `.turbo/**`: Monorepo build orchestrator cache.

### 2. Test Run & Temporary Artifacts
- `apps/web/test-results/**`: Playwright raw video, traces, and test output.
- `apps/web/playwright-report/**`: Playwright HTML report output.
- `apps/web/e2e/.auth/**`: Stored browser authentication state / session tokens.
- `apps/web/public/brand/.tmp/**`: Temporary branding vector conversion files.

### 3. Scratch & Experimental Directories
- `scratch/**`: Pre-existing developer scratchpad scripts.
- `apps/web/scratch/**`: Web UI scratchpad notes.
- `apps/api/src/scratch/**`: API experimental code.

### 4. Native Shell Build Caches
- `apps/web/android/app/build/**`: Gradle Android build outputs.
- `apps/web/android/.gradle/**`: Gradle cache.
- `apps/web/android/build/**`: Top-level Android build outputs.

### 5. Spec & Tooling Metadata
- `.git/**`: Git VCS internal data.
- `.gemini/**`: Agent CLI internal runtime data.
- `.system_generated/**`: Sandbox execution logs.
- `.specify/**` (except `constitution.md` and feature specs): Spec Kit tool metadata.
