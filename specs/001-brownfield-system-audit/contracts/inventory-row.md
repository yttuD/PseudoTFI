# Inventory Row Contract

Every manifest row MUST contain:

| Field | Contract |
|---|---|
| ID | Stable, unique within the audit |
| Kind | surface, interaction, capability, migration, or test |
| Route kind | rendered page, redirect alias, layout, loading state, or not applicable |
| Name | Human-readable canonical name |
| Audience | public, operational-workspace, dev-admin, or internal |
| Actor | anonymous, authenticated public user, Gestor, Delegado, or dev/admin |
| Channel | desktop-web, responsive-web, android-wrapper-readiness, future-native-android, or nonvisual |
| Entry point | Route, dialog trigger, endpoint, migration, or command |
| Source | One or more repository-relative source paths |
| Purpose | One concise observable outcome |
| Dependencies | IDs of related surfaces, interactions, or capabilities |
| Status | One exact value from the status taxonomy |
| Evidence | One or more evidence IDs, or a blocker ID |
| Verified at | ISO date and audit batch |
| Notes | Contradictions, exclusions, or limitations only |

Completeness rules:

- Every source-discovered item appears exactly once in its primary manifest.
- Localized URLs and multiple entry points reference one canonical item.
- Redirect aliases remain inventory rows but reference their destination and do not increment the
  distinct visual-surface denominator.
- Actor-specific verification uses an explicit actor context; one shared storage state cannot
  prove multiple roles.
- A verified status always links to fresh executable or browser evidence.
- Missing evidence forces implemented-unverified or environment-blocked status.
- Manifest totals reconcile with the independent discovery counts.
