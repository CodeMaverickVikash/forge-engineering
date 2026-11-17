# Go backends (net/http, chi, gin, echo)

## Identification

- `go.mod` (module path and `go` directive). Router from requirements: `github.com/go-chi/chi`, `github.com/gin-gonic/gin`, `github.com/labstack/echo`, or the standard library `net/http` (Go 1.22+ `ServeMux` supports method and path patterns).
- Layout conventions: `cmd/<app>/main.go` for binaries, `internal/` for private packages, `pkg/` only if the project already uses it.
- Workspace: `go.work` for multi-module repos.

## Architecture practices

- Handlers decode, validate, call a service, encode. Services take interfaces for dependencies defined where they are consumed ("accept interfaces, return structs").
- Pass `context.Context` as the first parameter through every layer down to DB and HTTP calls. Respect cancellation; never store contexts in structs.
- Set server timeouts (`ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`) and client timeouts (`http.Client{Timeout: ...}`); the zero-value client has none.
- Graceful shutdown with `server.Shutdown(ctx)` on signal.
- Dependency wiring in `main` or a small constructor; no global mutable state.
- Middleware for auth, request ID, logging and recovery, following the router's idiom (`func(http.Handler) http.Handler` for std lib and chi; `gin.HandlerFunc`; `echo.MiddlewareFunc`).

## Coding standards

- Errors are values: return them, wrap with context `fmt.Errorf("load user %d: %w", id, err)`, inspect with `errors.Is` / `errors.As`. Do not both log and return the same error.
- Sentinel or typed errors for domain cases (not found, conflict) mapped to HTTP status in one place.
- No `panic` for expected failures. Recover middleware only as a last resort.
- Structured logging with `log/slog` or the logger already used (zap, zerolog).
- Concurrency: every goroutine has a clear owner and exit path; use `errgroup` or `sync.WaitGroup`; protect shared state with mutexes or channels. Close response bodies (`defer resp.Body.Close()`).
- Validate input explicitly or with the validator already in use (`go-playground/validator`, gin binding tags).

## Common security issues

- SQL built with `fmt.Sprintf`; use placeholders (`$1` for Postgres, `?` for MySQL) with `database/sql`, pgx or the ORM.
- Missing request body limits (`http.MaxBytesReader`) and missing timeouts (slowloris).
- `os/exec` with a shell and interpolated input; path traversal with unchecked `filepath.Join` (verify the result stays under the base dir).
- `InsecureSkipVerify: true` in TLS config; `math/rand` for tokens (use `crypto/rand`).
- Data races on shared maps; run tests with `-race` when the platform supports it.

## Testing tools

- `testing` package with table-driven tests and `t.Run` subtests; `net/http/httptest` for handlers and fake upstream servers.
- `testify` (assert/require) or `go-cmp` only if already used.
- Integration tests behind build tags or `testing.Short()` per project convention; Testcontainers-go if present.

## Lint / format

- `gofmt` / `goimports` formatting is mandatory. `go vet` always applies.
- `golangci-lint run` when `.golangci.yml` / `.golangci.yaml` / `.golangci.toml` exists. `staticcheck` if configured.

## Build / validation commands (if configured)

```bash
go build ./...
go vet ./...
go test ./...
go test -race ./...          # needs cgo on some platforms
gofmt -l .                   # lists unformatted files; empty output means clean
golangci-lint run            # only with a config present
```
Check the `Makefile` or `Taskfile.yml` for project-specific targets first.

## Official docs

- Go: https://go.dev/doc/ · Effective Go: https://go.dev/doc/effective_go
- Standard library: https://pkg.go.dev/std
- chi: https://go-chi.io/ · Gin: https://gin-gonic.com/docs/ · Echo: https://echo.labstack.com/docs
- golangci-lint: https://golangci-lint.run/
