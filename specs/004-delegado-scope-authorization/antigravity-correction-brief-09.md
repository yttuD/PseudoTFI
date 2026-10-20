# Antigravity Correction Brief 09 — UI-017 Geometry and Worker Exit

Implement only T107–T108. Do not run the full 22-test suite and do not update evidence reports.

## Exact failure

The new objective assertion failed at the 375px capture:

```text
Expected dialogBox.x >= 0
Received -34.4921875
```

`AlquilerFormModal` supplies `max-w-lg`, while the shared `DialogContent` supplies a viewport-safe
maximum. Because `cn` now uses Tailwind merge, the component maximum replaces the safe one. Give the
modal an explicit mobile maximum such as `max-w-[calc(100vw-2rem)]` and apply `sm:max-w-lg` only from
640px upward; keep one authoritative width and border-box geometry. Do not weaken/remove the
bounding assertions.

## Remaining hang

After all test results printed (21 pass, UI-017 fail), Playwright emitted no summary for more than a
minute and port 3000 remained owned by Next. Global teardown therefore did not complete. The PID
wrapper cleans its tree when Codex sends Ctrl+C, so the issue is before/around normal teardown.
Inspect test-worker-owned handles, especially the mock API started in `test.beforeAll` and stopped in
`test.afterAll`. Make its shutdown definitive (`closeAllConnections`/socket destruction/close and no
referenced timers or server handles), or move ownership out of the test worker while preserving the
same deterministic API behavior. Cleanup must remain PID-scoped; never kill arbitrary listeners.

Run only:

1. web lint;
2. the single UI-017 Playwright test (use `-g "UI-017"`) and require natural exit with its summary;
3. verify ports 3000/3001 are empty after exit.

Return terminal PASS/FAIL with the exact exit code and changed files. Docker/API/database/reports and
all other screenshots are out of scope.
