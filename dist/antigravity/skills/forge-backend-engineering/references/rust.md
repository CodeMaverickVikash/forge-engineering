# Rust backends (axum, actix-web)

## Identification

- `Cargo.toml` with `axum`, `actix-web`, or another web crate (`rocket`, `warp`, `poem`). `Cargo.lock` present for binaries.
- Workspaces: `[workspace]` in the root `Cargo.toml` with member crates.
- Toolchain pin: `rust-toolchain.toml` / `rust-toolchain`. Edition from `edition` in `Cargo.toml`.
- Async runtime: usually `tokio` (axum) or actix's runtime; data access via `sqlx`, `diesel`, `sea-orm`, or `tokio-postgres`.

## Architecture practices

- **axum**: `Router` with handlers as async functions; extractors (`State`, `Path`, `Query`, `Json`) for input; shared state via `State<AppState>` holding pools and clients (`Arc` where needed); middleware via `tower` layers (`tower-http` for tracing, CORS, timeouts, body limits).
- **actix-web**: `App` with `web::scope`/`service`; `web::Data<T>` for shared state; extractors similar to axum; middleware via `wrap`.
- Errors: a crate-level error enum implementing `IntoResponse` (axum) or `ResponseError` (actix) to map domain errors to HTTP status and a stable JSON body in one place.
- Keep handlers thin; put logic in plain functions or services that are testable without the HTTP layer.
- Never block the async runtime: use async drivers, or `tokio::task::spawn_blocking` for CPU-heavy or blocking work.
- Config from environment (the project's config crate or `std::env`), parsed once at startup into a typed struct.

## Coding standards

- Propagate errors with `Result` and `?`. Libraries commonly use `thiserror` for typed errors; applications often use `anyhow` with `.context(...)`. Follow the crate's choice.
- No `unwrap()`/`expect()` on fallible runtime input in request paths; reserve them for invariants that are truly impossible to violate, with a message saying why.
- Validate input after deserialization (`serde`) with explicit checks or the validator crate in use. Use `#[serde(deny_unknown_fields)]` where the API convention requires strictness.
- `tracing` for structured logs and spans; propagate request IDs through `tower-http` or middleware.
- `unsafe` only with a documented safety argument (`// SAFETY:` comment) and only if the project already permits it; new backend code should not need it.

## Common security issues

- SQL built with `format!`; use bound parameters (`sqlx::query!`/`query_as!` macros or `.bind()`), diesel's query builder.
- Missing body size limits or timeouts (`tower_http::limit`, `TimeoutLayer`); unbounded `Vec` growth from untrusted input.
- Panics in handlers (index out of bounds, `unwrap`) leading to dropped connections or DoS.
- Secrets in `Debug` output; avoid deriving `Debug` on config holding secrets or use a redacting wrapper (`secrecy` crate if present).
- Path traversal when serving files; verify canonicalized paths stay under the root.

## Testing tools

- `cargo test` with unit tests in `#[cfg(test)] mod tests` and integration tests in `tests/`. Async tests via `#[tokio::test]` / `#[actix_web::test]`.
- axum: call the `Router` directly with `tower::ServiceExt::oneshot`. actix: `actix_web::test::init_service` and `test::call_service`.
- `sqlx::test` for database tests when sqlx is used.

## Lint / format

- `cargo fmt` (`rustfmt.toml` if present) and `cargo clippy` with project lint settings (`[lints]` in `Cargo.toml` or `clippy.toml`).

## Build / validation commands (if configured)

```bash
cargo build
cargo test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings   # if the project treats warnings as errors
```
Add `--workspace` for workspaces, or `-p <crate>` to scope. sqlx offline mode may require `SQLX_OFFLINE=true` and a committed `.sqlx/` directory.

## Official docs

- The Rust Book: https://doc.rust-lang.org/book/ · std: https://doc.rust-lang.org/std/
- axum: https://docs.rs/axum/latest/axum/
- actix-web: https://actix.rs/docs/
- Tokio: https://tokio.rs/tokio/tutorial · Clippy: https://doc.rust-lang.org/clippy/
