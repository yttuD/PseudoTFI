# Antigravity Correction Brief 10 — Final Deterministic Server Stop

Implement only this exact correction. Do not run the full suite or update reports.

## Stable UI-017 geometry

After the last CSS fix, DOM `getBoundingClientRect()` settles at `x=5.0547`, width `364.89` on the
375px viewport, but Playwright's first `boundingBox()` is sampled during `zoom-in-95` at `x=0`.
Replace the temporary debug log with an `expect.poll` (or equivalent deterministic wait) that waits
for the dialog's bounding box to settle at the required inset before reading all final boxes. Keep
the `x >= 4` and right inset assertions unchanged. Remove `[DEBUG-UI-017]` logging.

## Server exit without taskkill

The Playwright global teardown runs, removes `webserver.pid`, and attempts `taskkill`, but the
wrapper/Next tree remains alive. The CLI then waits indefinitely until Codex manually kills the exact
tree; immediately afterward Playwright prints its summary. Eliminate OS kill commands entirely:

1. Make `e2e/fixtures/test-server.js` own the Next development HTTP server in the same Node process
   through the Next programmatic API (`next({ dev: true, dir })`, `prepare`, request handler, Node
   HTTP server on port 3000). Do not spawn `next dev` as a child.
2. Have the wrapper write its PID file and poll/watch a run-owned stop marker under `e2e/.auth`.
   On marker or SIGINT/SIGTERM: stop accepting connections, close idle/all connections, call
   `app.close()` if available, remove PID/stop files, then exit. Make shutdown idempotent.
3. In `global.teardown.ts`, write that exact stop marker and wait boundedly for the run-owned PID
   file to disappear. Do not import the worker's mock-server singleton, enumerate ports, invoke
   `taskkill`, `Stop-Process`, or kill arbitrary processes.
4. Remove stale marker files at wrapper startup. The mock API remains owned/closed by test
   `beforeAll/afterAll`, using the hardened shutdown already present.

Run web lint and only `UI-017`. It must pass and the Playwright command must print `1 passed`, return
exit code 0 naturally, and leave no 3000/3001 listeners. Return one terminal PASS/FAIL. Do not touch
Docker, API, SQL, reports, screenshots outside UI-017, or unrelated code.
