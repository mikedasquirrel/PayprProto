# Backup and Migration Strategy

## Dev/Prototype (SQLite)
- Backup: copy `paypr.db` regularly (cold copy while app is stopped for consistency).
- Migrations: `flask db migrate -m "..."` and `flask db upgrade`.
- Restore: replace `paypr.db` with backup copy.

## Staging/Prod (Future, Postgres suggested)
- Daily full backups via managed snapshots + point-in-time recovery.
- Alembic migrations: standard `upgrade` during deploy; `downgrade` only in emergencies.
- Schema changes:
  - Backfill scripts for large data migrations.
  - Non-blocking deploys: additive changes first, then code switch, then cleanup.

## Operational Notes
- Tag migration versions in CI; require green tests before applying.
- Keep migration history in VCS; never edit applied migrations—create new ones.
