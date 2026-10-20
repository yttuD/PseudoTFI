# Acceptance Matrix (`acceptance-matrix.md`)

Conforms strictly to `contracts/acceptance-matrix.md`.

Schema:  
`Case ID | Inventory ID | Actor | State | 375 light | 375 dark | 768 light | 768 dark | 1024 light | 1024 dark | 1440 light | 1440 dark | Functional | Authorization | Accessibility | Evidence`

Cell Values: `PASS`, `FAIL`, `BLOCKED: rationale`, `PENDING: batch`, or `EXCLUDED: rationale`.

---

## Acceptance Cases Matrix Shell

| Case ID | Inventory ID | Actor | State | 375 light | 375 dark | 768 light | 768 dark | 1024 light | 1024 dark | 1440 light | 1440 dark | Functional | Authorization | Accessibility | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-PUB-001 | SURF-001 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-001__*` |
| TC-PUB-002 | SURF-001 | public_user | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-001__*` |
| TC-PUB-003 | SURF-002 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-002__*` |
| TC-PUB-004 | SURF-002 | anonymous | empty | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-002__*` |
| TC-PUB-005 | SURF-003 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-003__*` |
| TC-PUB-006 | SURF-003 | public_user | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-003__*` |
| TC-PUB-007 | SURF-004 | public_user | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-004__*` |
| TC-PUB-008 | SURF-004 | anonymous | denied | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | PASS | PASS | PASS | Redirects to `/auth/login` |
| TC-PUB-009 | SURF-005 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-005__*` |
| TC-PUB-010 | SURF-006 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-006__*` |
| TC-PUB-011 | SURF-007 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-007__*` |
| TC-PUB-012 | SURF-008 | anonymous | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-008__*` |
| TC-PUB-013 | SURF-026 | public_user | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/public/accepted/SURF-026__*` |
| TC-PUB-014 | SURF-026 | anonymous | denied | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | PASS | PASS | PASS | Redirects to `/auth/login` |
| TC-GES-001 | SURF-010 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/SURF-010__*` |
| TC-GES-002 | SURF-010 | delegado_read | default | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | PASS | PASS | PENDING:US3 | `evidence/screenshots/gestor/baseline/SURF-010__*` |
| TC-GES-003 | SURF-011 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-domain/SURF-011__*` |
| TC-GES-004 | SURF-011 | delegado_manage | scoped | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | PASS | PASS | PENDING:US3 | `evidence/screenshots/gestor/baseline/SURF-011__*` |
| TC-GES-005 | SURF-012 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-domain/SURF-012__*` |
| TC-GES-006 | SURF-012 | delegado_read | denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | PASS | PASS | PASS | 403 Denial Feedback Banner verified |
| TC-GES-007 | SURF-013 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-domain/SURF-013__*` |
| TC-GES-008 | SURF-014 | gestor | redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | EXCLUDED:redirect | PASS | PASS | PASS | Server redirect to `/mis-unidades` verified |
| TC-GES-009 | SURF-015 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-domain/SURF-015__*` |
| TC-GES-010 | SURF-015 | delegado_read | default | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | PASS | PASS | PENDING:US3 | Read-only badge and table verified |
| TC-GES-011 | SURF-016 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-domain/SURF-016__*` |
| TC-GES-012 | SURF-016 | delegado_manage | scoped | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | FAIL:modality | PASS | PENDING:US3 | Modal lacks modality selectors |
| TC-GES-013 | SURF-017 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/SURF-017__*` |
| TC-GES-014 | SURF-017 | delegado_manage | denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | PASS | PASS | PASS | `owner-only-forbidden` screen verified |
| TC-GES-015 | SURF-018 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/SURF-018__*` |
| TC-GES-016 | SURF-018 | delegado_read | denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | PASS | PASS | PASS | `owner-only-forbidden` screen verified |
| TC-GES-017 | SURF-019 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/SURF-019__*` |
| TC-GES-018 | SURF-019 | delegado_manage | denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | PASS | PASS | PASS | `owner-only-forbidden` screen verified |
| TC-GES-019 | SURF-020 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/SURF-020__*` |
| TC-GES-020 | SURF-020 | delegado_read | denied | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | AUDITED | PASS | PASS | PENDING:US3 | Non-financial metrics view verified |
| TC-GES-021 | SURF-021 | gestor | default | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/SURF-021__*` |
| TC-GES-022 | SURF-021 | delegado_manage | denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | EXCLUDED:denied | PASS | PASS | PASS | `owner-only-forbidden` screen verified |
| TC-GES-OPS-01 | FORM-002 | gestor | modal | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/FORM-002__*` |
| TC-GES-OPS-02 | FORM-007 | gestor | modal | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/FORM-007__*` |
| TC-GES-OPS-03 | FORM-013 | gestor | modal | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `evidence/screenshots/gestor/accepted-operations/FORM-013__*` |
| TC-DEV-001 | SURF-022 | dev_admin | default | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING | PASS | PENDING | PENDING |
| TC-DEV-002 | SURF-022 | gestor | denied | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PASS | PASS | PASS | `owner-only-forbidden` screen |
| TC-DEV-003 | SURF-023 | dev_admin | default | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING | PASS | PENDING | PENDING |
| TC-DEV-004 | SURF-024 | dev_admin | default | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING | PASS | PENDING | PENDING |
| TC-DEV-005 | SURF-025 | dev_admin | default | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING:US4 | PENDING | PASS | PENDING | PENDING |
