# Acceptance Matrix Contract

Each auditable cell uses:

`Case ID | Inventory ID | Actor | State | 375 light | 375 dark | 768 light | 768 dark | 1024 light | 1024 dark | 1440 light | 1440 dark | Functional | Authorization | Accessibility | Evidence`

Cell values: `PASS`, `FAIL`, `BLOCKED`, or `EXCLUDED: rationale`.

PASS requires:

- correct content and action for the actor;
- no horizontal overflow or clipped required action;
- stable rendering after transitions;
- computed contrast at WCAG AA thresholds;
- visible keyboard focus and semantic accessible name;
- required touch controls at least 44 by 44 pixels;
- expected loading, empty, validation, error, success or denial state;
- fresh named screenshot.

A desktop PASS never implies a responsive PASS. A light PASS never implies a dark PASS. A Gestor PASS never implies a Delegado PASS.
