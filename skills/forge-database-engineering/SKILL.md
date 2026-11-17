---
name: forge-database-engineering
description: Schema design, safe migrations, indexing, query plans, N+1 and transactions across SQL and NoSQL stores. Use for any schema, migration or query change.
user-invocable: false
---

# Database Engineering

Data outlives code. Every change must preserve existing data, keep the running application working during deploy, and be reversible or carry an explicit rollback note. Discover the engine, ORM, migration tool and commands from `.forge/context.json` and the existing migrations before writing anything.

## Safety rules (non-negotiable)

- Run migrations, seeds and destructive statements **only against local or disposable test databases**. Check the connection target (env var **names**, config files, docker-compose) before running anything. If it is not clearly local, do not run it; report `NOT RUN`.
- Never drop, truncate or delete data, or rename columns in use, without explicit user authorization relayed by the orchestrator.
- Never edit a migration that may already have run elsewhere (anything committed). Add a new migration instead.
- Generate migrations with the project's tool (Prisma, Drizzle Kit, Alembic, Django, Rails, Laravel, Flyway, Liquibase, EF Core, golang-migrate, sqlx) and follow its naming and folder convention. Review generated SQL; generators produce destructive diffs on renames.
- Test every migration **up and down (or rollback) locally**, then up again. Record the commands and results.

## Schema design checklist

- [ ] Primary key on every table, matching the existing ID strategy (bigint identity, UUID, ULID).
- [ ] `NOT NULL` by default; nullable only with a reason.
- [ ] Foreign keys with deliberate `ON DELETE` behavior; unique constraints for natural keys and idempotency keys; `CHECK` constraints for simple invariants. The database enforces integrity, not just the app.
- [ ] Correct types: money as integer minor units or `DECIMAL`/`NUMERIC` (never float); timestamps timezone-aware (`timestamptz` in Postgres) stored in UTC; enums via the project's convention.
- [ ] Naming consistent with existing tables (plural or singular, snake_case, `_id` suffixes, index names).
- [ ] Audit columns (`created_at`, `updated_at`) and soft-delete only if the project uses them. Soft delete requires unique indexes and queries that account for it.
- [ ] Multi-tenant data carries the tenant key, indexed, and every query filters by it.

## Zero-downtime migrations (expand / contract)

Old and new application versions run side by side during a deploy. Each step must be compatible with both.
1. **Expand**: add new nullable columns or tables, new indexes (concurrently where supported). No drops, no renames, no type narrowing.
2. **Dual write / backfill**: application writes both shapes; backfill existing rows in **batches** (bounded by primary key range, small transactions, throttled, resumable). Never one giant `UPDATE` on a large table.
3. **Switch reads** to the new shape; then enforce constraints (`NOT NULL`, FK) once data is complete, using validation steps that avoid long locks where the engine supports it.
4. **Contract**: drop old columns in a later release, after no code reads them.
- Rename = add new + backfill + switch + drop old. Never a direct rename on a live column.
- Large tables: check lock behavior before altering. Set a lock timeout on DDL where supported. Flag any table-rewriting change in the report with an estimate of row count if known.
- Data migrations are separate from schema migrations when the tool allows, and are idempotent.

## Indexing and query performance

- Index for actual query patterns: filter, join and sort columns; composite index column order follows equality first, then range or sort. Every foreign key used in joins usually needs an index (Postgres does not create them automatically).
- Verify with `EXPLAIN` (and `EXPLAIN ANALYZE` on local data only; it executes the query). Look for sequential scans on large tables, row-estimate mismatches, sorts spilling to disk, and nested loops over large sets.
- Do not add indexes speculatively: each one costs write throughput and storage. Remove only with evidence it is unused.
- Select only needed columns; paginate with keyset (`WHERE id > ? ORDER BY id LIMIT n`) for large sets; avoid `OFFSET` deep pages.
- Avoid functions on indexed columns in `WHERE` unless an expression index exists; avoid leading-wildcard `LIKE` without a trigram or full-text index.

## N+1 and ORM pitfalls

- **N+1**: a query per row in a loop or serializer. Detect by enabling query logging in tests or dev, counting queries per request, or using the stack's tooling (Django debug toolbar or `assertNumQueries`, Rails Bullet or `strict_loading`, Laravel `preventLazyLoading`, Hibernate statistics). Fix with eager loading, batched `IN` queries or joins.
- Lazy loading outside a session or transaction; accidental `EAGER` fetches loading huge graphs.
- Loading whole tables into memory (`all()`, `findAll()`); use streaming or chunked iteration.
- ORM `save()` of a full entity overwriting concurrent changes; use targeted updates or optimistic locking (version column).
- Mass assignment from request data into models.
- Raw SQL with string interpolation; always bind parameters.
- Generated migrations that drop and recreate a column instead of renaming, losing data.

## Transactions and concurrency

- Wrap multi-statement invariants in a transaction; keep it short; no network calls or user waits inside.
- Know the default isolation (Postgres and SQL Server: Read Committed; MySQL InnoDB: Repeatable Read; SQLite: serializable writes with a single writer). Raise it only where needed, and handle serialization or deadlock errors with a bounded retry.
- Prevent lost updates with atomic statements (`UPDATE ... SET n = n + 1`), `SELECT ... FOR UPDATE`, optimistic version checks, or unique constraints with upsert (`ON CONFLICT` / `ON DUPLICATE KEY`).
- Consistent lock ordering across code paths to avoid deadlocks.

## Engine notes

- **PostgreSQL**: `CREATE INDEX CONCURRENTLY` (cannot run inside a transaction block; many migration tools need a flag to disable the wrapping transaction). Add FKs and checks with `NOT VALID` then `VALIDATE CONSTRAINT`. Adding a column with a constant default is cheap on modern versions; volatile defaults and type changes rewrite the table. Set `lock_timeout` for DDL.
- **MySQL (InnoDB)**: many `ALTER TABLE` operations support `ALGORITHM=INPLACE` or `INSTANT`, but not all; check before altering large tables. Use `utf8mb4`. DDL causes implicit commits, so migrations are not transactional.
- **SQLite**: limited `ALTER TABLE`; many changes require table rebuild (create new, copy, swap). Foreign keys need `PRAGMA foreign_keys = ON`. Single writer; keep write transactions short.
- **MongoDB**: schema lives in code; enforce shape with JSON Schema validators where used; design documents around access patterns (embed vs reference); create indexes deliberately (unique, compound, TTL); multi-document transactions need a replica set; backfill with batched `updateMany` on bounded filters.
- **Redis**: a cache or ephemeral store unless the project treats it as primary. Every key gets a TTL unless it is intentionally permanent; namespaced keys; avoid `KEYS *` (use `SCAN`); define cache invalidation on writes; never cache authorization decisions without expiry.

## Procedure

1. Read the current schema, the latest migrations, the models and the queries on the affected path.
2. Design the change with the checklists above; decide expand/contract steps if any live data is affected.
3. Generate or write the migration with the project tool; review the SQL it produces.
4. Run locally: migrate up, run tests, roll back, migrate up again. Check for missing-migration detection commands the stack offers.
5. Check query plans for new or changed hot queries with `EXPLAIN` on local data.
6. Update seeds, fixtures, factories and the schema snapshot if the project commits one.

## Output

Report: migration files and what each does, up/down test results with commands, lock or rewrite risk and table-size assumptions, backfill plan, new indexes with the queries they serve, rollback steps, and any destructive step that needs user authorization.
