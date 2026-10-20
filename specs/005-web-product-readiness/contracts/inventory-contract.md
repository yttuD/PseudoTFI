# Inventory Contract

Every active product item is represented by one Markdown table row with:

`ID | Kind | Name | Audience | Allowed actors | Denied actors | Channel | Entry point | Source paths | Dependencies | Current status | Evidence | Notes`

Rules:

1. IDs are stable across reruns; removed items remain in the delta report rather than being silently renumbered.
2. `Current status` is one of `verified`, `unverified`, `partial`, `placeholder`, `blocked`, `absent`, `redirect`, `excluded`.
3. `verified` requires fresh executable evidence.
4. Routes and forms declare both audience and exact actor set.
5. Desktop and responsive dispositions are recorded independently in the acceptance matrix.
6. Source denominators include tracked and untracked active files while excluding build output, dependencies, retained evidence and task-owned temporary artifacts.
