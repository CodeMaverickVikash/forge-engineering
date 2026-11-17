### FORGE Execution Report

**Task:** Add a status column to the orders table (values: PENDING, PAID, CANCELLED; default PENDING).

**Enhanced specification:** Added `orders.status` via a new Flyway migration V2: `VARCHAR(20) NOT NULL DEFAULT 'PENDING'` with a named `CHECK (status IN ('PENDING','PAID','CANCELLED'))`. Existing rows read as PENDING, and inserts without a status default to PENDING. Any other value, including lowercase, and NULL are rejected by the database. V1 is untouched. No Java, API or pom change.

**Project understanding:** The project is a Spring Boot 3.4.1 / Java 17 / Maven / Flyway / PostgreSQL skeleton.
- `V1__init.sql` creates `orders(id BIGSERIAL PRIMARY KEY)`.
- The Java sources are empty classes, so no entity, repository, controller or config references orders.
- `mvnw` is a 0-byte file and Maven is not installed.
- A PostgreSQL 18 service you own runs on :5432. I never touched it.

**Specialists involved:** Native subagents (Mode A).
- Parallel read-only wave: forge-architect, forge-backend-engineer, forge-qa-lead.
- Implementation: forge-database-engineer.
- Review: forge-code-reviewer, which returned "approve with comments".
- Skills I loaded: the forge-project-exploration detector script only.

**Implementation:**
- **Migration V2:** one transactional `ALTER` adds the column, default, NOT NULL and the named CHECK `orders_status_check`.
  - The database engineer reported no table rewrite on 100k rows (same `relfilenode` before and after).
  - There is no `UPDATE` backfill and no index, since nothing filters on status yet.
- **Regression test:** `StatusMigrationTest` has 5 plain-JDBC tests covering AC1–AC5 plus the constraint name. It skips unless `ORDERS_TEST_DB_URL` is set, so a plain test run stays green without a database.
- **Files changed (both new, untracked):**
  - `src/main/resources/db/migration/V2__add_orders_status.sql`: the migration.
  - `src/test/java/com/acme/orders/StatusMigrationTest.java`: the migration test.
  - `git diff --stat` is empty: no tracked or staged file was modified.
- **Decisions:**
  - VARCHAR+CHECK was chosen over a native ENUM (values are hard to remove, awkward with Hibernate) and a lookup table (overkill for 3 fixed values).
  - Rollback is roll-forward with a V3, since Flyway Community has no undo.

**QA and verification:**
| Gate | Command / method | Status | Evidence |
|------|------------------|--------|----------|
| G1 Existing tests | `./mvnw test` | UNAVAILABLE | `mvnw` is 0 bytes and `mvn` is not installed; the baseline had 0 tests anyway |
| G2 New tests | `StatusMigrationTest` via javac + junit-platform-console-standalone 1.11.4 + postgresql 42.7.4 on a throwaway PG 18 (port 55435) | PASSED | "5 tests successful, 0 failed", re-run by me after my edit; not run through Maven/Surefire |
| G2 Test sensitivity | Same test with a mutated V2 | PASSED | Constraint renamed: 4 pass, 1 fails. The database engineer's nullable-column mutation failed 5 of 5 |
| G2 Skip behavior | Same test, no env var | PASSED | "5 tests skipped", `Environment variable [ORDERS_TEST_DB_URL] does not exist` |
| G3 Compile | `javac -Xlint:all` (JDK 17) | PASSED | no warnings |
| G4 Lint | none configured | N/A | |
| G5 Build | `./mvnw -DskipTests package` | UNAVAILABLE | no Maven |
| G7 Security | reviewer grep for secrets and ports; no input or PII handling added | PASSED | none found; credentials only from env vars |
| G12 Migration safety | psql on throwaway PG 18, run by me | PASSED | see detail below |
| G12 Flyway itself | real Flyway run and checksum validation | UNAVAILABLE | no Maven, and the pom lacks the PostgreSQL module (see Issues) |
| G13 Independent review | forge-code-reviewer | PASSED | approve with comments; 1 minor fixed, nits mostly skipped |
| G14 Scope | `git status`, `git diff --stat` | PASSED | 2 new files only (plus pre-existing `.claude/`); V1, `pom.xml` and `mvnw` unchanged; no jars or classes in the tree |
| G10 Browser QA | none | N/A | no UI |

G12 detail:
- With 2 pre-existing rows, the backfill gave `PENDING|2`.
- The column came out as `varchar(20)`, NOT NULL, default `'PENDING'`.
- `REFUNDED`, `paid`, `" PAID"`, `"PAID "` and `""` were rejected by `orders_status_check`.
- NULL was rejected by the not-null constraint.
- `PAID`, `CANCELLED` and `PENDING` were accepted.
- Re-running V2 failed with "column already exists".
- The database engineer also checked a 100k-row table, atomicity (a failed V2 leaves nothing applied) and up/down/up.

**Browser QA:** N/A, no browser-visible change.

**Issues:**
- **Identified:**
  - The pom has `flyway-core` only. Boot 3.4.1 manages Flyway 10.20.1, which needs `flyway-database-postgresql` to migrate PostgreSQL. The database engineer confirmed the core jar has no PostgreSQL support.
  - This was already the case and is dormant, since no app starts today. A real Flyway run would fail on V1 and V2.
  - `mvnw` is an empty file.
- **Fixed:** the reviewer's minor finding. The test now asserts the constraint name, and I applied the `assertTrue` nit.
- **Unresolved / limitations:**
  - Both items under Identified are untouched because pom and `mvnw` changes were out of scope.
  - The test applies the SQL over JDBC, so Flyway's history and checksum handling is unverified.
  - I left the reviewer's other nit (a redundant `SET search_path` in teardown).

**Assumptions:**
- VARCHAR+CHECK rather than a native ENUM.
- Values are stored uppercase.
- No index yet.
- Existing rows become PENDING.
- The test is opt-in via an environment variable.

**Remaining work:** needs your decision.
- Add `org.flywaydb:flyway-database-postgresql` (version managed by Boot) to the pom and restore a real Maven wrapper. Then run the migration through Flyway and the test through Maven once.
- Before applying to a large production table, consider `NOT VALID` plus `VALIDATE CONSTRAINT`, and take a backup.

**Git status:** Branch `master`; 0 files modified, 2 added (untracked: the V2 migration and its test), 0 deleted (uncommitted). No commit, push, or pull request was created.

The saved report is `.forge/tasks/orders-status-column/report.md`, and the durable project notes are in `.forge/knowledge.md`.
