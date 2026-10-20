# UI Contract: Modality-Aware Availability

## Design intent

Use the Rendo palette and existing design tokens, not the layout shown in the palette reference.
Availability must read as operationally trustworthy: no random green status, hidden fallback, or
optimistic “free” state. Desktop web and responsive web are separate evidence targets. Native
Android is not certified by these captures.

## Shared interaction requirements

- Keyboard-visible focus on every date, time, mode, schedule, dialog and action control.
- Minimum 44 by 44 pixel touch targets at 375 and 768 widths.
- Inline, field-associated errors plus one form-level summary for conflicts/server errors.
- Loading skeletons preserve layout; error states include retry; unknown is visually distinct from
  unavailable.
- Reduced motion disables decorative transitions.
- Public copy is localized in ES/PT/EN. Operational workspace remains Spanish in this feature.
- Color never carries state alone; every status includes text and an icon.
- Public output never names a Seña, Inquilino, Alquiler, Gestor, private reason or block source.

## Surface 1: Nuevo/editar Alquiler

**Route**: /{locale}/alquileres  
**Component**: AlquilerFormModal  
**Audience**: Gestor; Delegado gestionar after REMED-004  
**Forbidden**: anonymous, public authenticated user, Delegado ver

### Required behavior

1. Selecting a Unidad loads its active Modalidades de precio and effective availability rule.
2. Selecting a monthly or daily modality shows a local-date range with an explicit exclusive
   checkout/end label and minimum duration.
3. Selecting an hourly modality shows date, start/end time, timezone label, operating hours and
   turnaround information.
4. Seña is visibly optional. Choosing no Seña or pending Seña states that no automatic calendar
   block will be created.
5. Marking Seña collected requires a positive amount and states that the period will be blocked.
6. Conflict response preserves all entered fields, moves focus to the error summary and provides a
   route/action to inspect the operational calendar.
7. Database unavailable prevents submission and never reports success through demo data.

### States to verify

| State ID | State |
|---|---|
| ALQ-MONTH | Monthly modality, valid minimum period |
| ALQ-DAY | Daily modality, arrival/departure period |
| ALQ-HOUR | Hourly modality with schedule and buffer |
| ALQ-NO-SENA | Optional Seña omitted; no automatic-block explanation |
| ALQ-SENA | Positive Seña marked collected; block explanation |
| ALQ-CONFLICT | 409 overlap error with preserved values/focus |
| ALQ-UNKNOWN | Rule/backfill pending; submission requiring availability is prevented |
| ALQ-ERROR | 503 retryable authoritative-service failure |
| ALQ-FORBIDDEN | Delegado ver receives disabled/forbidden mutation state |

## Surface 2: Disponibilidad de Unidad

**Route**: /{locale}/mis-unidades/{id}/editar  
**Component**: DisponibilidadPanel  
**Audience**: Gestor; scoped Delegados according to ver/gestionar

### Required behavior

- Displays effective origin as “Configuración propia” or “Heredada de {Grupo}”.
- Gestor/Delegado gestionar can switch between own rule and inheritance after seeing the prospective
  effective schedule. Delegado ver can inspect but cannot edit.
- Weekly editor supports multiple intervals per day, closed days, valid ordering and no overlap.
- Buffer is an integer-minute field with explanatory copy.
- Operational calendar shows Seña blocks and private/manual blocks with private labels only here.
- Manual block dialog supports maintenance/private use and requires a private reason.
- Group move or rule change that invalidates future blocks shows all affected Unidad names/counts
  without partially applying the change.
- Pending legacy review uses an explicit blocking banner and review count.

### States to verify

| State ID | State |
|---|---|
| UNIT-OWN | Own hourly rule and weekly editor |
| UNIT-INHERITED | Readable inherited rule with Grupo origin |
| UNIT-READONLY | Delegado ver read-only controls |
| UNIT-MANUAL | Manual block dialog, valid and invalid fields |
| UNIT-CONFLICT | Buffer/rule/manual-block conflict |
| UNIT-BACKFILL | Pending historical review |
| UNIT-EMPTY | No blocks in requested window |
| UNIT-ERROR | Authoritative service unavailable |

## Surface 3: Regla común de Grupo

**Route**: /{locale}/mis-unidades  
**Components**: GrupoFormModal and Grupo availability action in BentoGruposGrid  
**Audience**: Gestor; scoped Delegado gestionar after REMED-004

### Required behavior

- Creating/editing a Grupo may explicitly enable a common hourly rule.
- Before save, show the count and names of inheriting Unidades; overridden Unidades are separately
  identified and never overwritten.
- Saving a rule validates all inheriting future blocks atomically.
- A conflict identifies affected Unidades without exposing Inquilino/payment details.
- Disabling the common rule is blocked while an inheriting hourly Unidad would become unconfigured.

### States to verify

| State ID | State |
|---|---|
| GROUP-OFF | Common rule disabled |
| GROUP-ON | Valid weekly schedule and buffer |
| GROUP-PREVIEW | Inheriting versus overridden Unidad summary |
| GROUP-CONFLICT | Rejected atomic update |
| GROUP-FORBIDDEN | Actor lacks manage scope |

## Surface 4: Public Unidad detail

**Route**: /{locale}/unidades/{id}  
**Component**: AvailabilityCalendar  
**Audience**: anonymous and authenticated public users with identical calendar data

### Required behavior

- Modality tabs use the Unidad's active Modalidades de precio.
- Monthly/daily modes render blocked date ranges; hourly mode renders only slots inside the effective
  schedule and respects the buffer.
- Block labels are only “No disponible”; no source/reason or operational identity appears.
- configured with zero intersections means no blocked periods in the requested window, not a global
  promise of future availability.
- unknown/backfill pending shows “Disponibilidad aún no confirmada” and disables any availability
  claim.
- 503 shows localized retry. It never converts to available.
- Anonymous and authenticated renders contain the same calendar fields.

### States to verify

| State ID | State |
|---|---|
| PUBLIC-MONTH | Monthly calendar with blocked range |
| PUBLIC-DAY | Daily calendar with adjacent valid boundary |
| PUBLIC-HOUR | Hourly schedule, occupied turn and buffer |
| PUBLIC-EMPTY | Configured window without blocked periods |
| PUBLIC-UNKNOWN | Not configured/backfill pending |
| PUBLIC-ERROR | Retryable 503 |
| PUBLIC-PRIVACY | Anonymous/authenticated payload and visible copy contain no private data |

## Surface 5: Marketplace card

**Route**: /{locale}/unidades  
**Component**: CardUnidad  
**Audience**: public

- Remove Math.random and both unverified status badges.
- Use neutral copy such as “Ver disponibilidad” only if a badge/action remains.
- Do not make one availability request per card.
- Pricing modality labels support month/day/hour accurately.

## Responsive and theme evidence matrix

Each state marked visual below requires a named Playwright assertion before screenshot capture.

| Width | Classification | Required themes | Required surfaces |
|---:|---|---|---|
| 375 | responsive web / phone viewport | light, dark | Alquiler, Unidad panel, Grupo dialog, public calendar, marketplace card |
| 768 | responsive web / tablet viewport | light, dark | Same |
| 1024 | desktop web | light, dark | Same |
| 1440 | desktop web | light, dark | Same |

Minimum retained screenshot set:

- Default/valid modality states: ALQ-MONTH, ALQ-DAY, ALQ-HOUR.
- Critical feedback states: ALQ-CONFLICT, UNIT-INHERITED, UNIT-MANUAL, GROUP-PREVIEW,
  GROUP-CONFLICT, PUBLIC-MONTH, PUBLIC-DAY, PUBLIC-HOUR, PUBLIC-UNKNOWN and PUBLIC-ERROR.
- Each required state at all four widths and both themes unless the state is proven to have no theme
  rendering. Any exception must be documented, not silently omitted.

File naming:

SURF-<surface>__<state-id>__<actor>__<width>w__<theme>.png

Store accepted captures under:

specs/003-modality-aware-availability/evidence/screenshots/

## Playwright proof rules

1. A screenshot is taken only after semantic assertions prove the intended state.
2. Network responses are deterministic fixtures or a seeded local database; no random state.
3. Every capture checks no horizontal overflow and no clipped focused element.
4. Mobile viewport proof is labeled responsive web, never native Android.
5. Trace/video/temp output is removed after review unless explicitly retained as evidence.
