# Deployment data model

This feature introduces no product tables or migrations. It configures three existing boundaries: a public web project, a private-credential API project, and the isolated Supabase beta project. A release record associates Git revision, hosted URLs, environment scope, health results, actor checks, and rollback target. Secret values are never stored in that record.
