# .NET backends (ASP.NET Core, EF Core)

## Identification

- `*.sln` / `*.slnx`, `*.csproj` (C#) or `*.fsproj` (F#). Web projects use `Sdk="Microsoft.NET.Sdk.Web"`.
- Target framework from `<TargetFramework>`; SDK pin in `global.json`. Central package versions in `Directory.Packages.props`; shared settings in `Directory.Build.props`.
- Style: Minimal APIs (`app.MapGet(...)` in `Program.cs`) or MVC controllers (`[ApiController]`). Follow what exists.

## Architecture practices

- Layering by project or folder (API, Application, Domain, Infrastructure) as the solution already defines it.
- Built-in DI: register in `Program.cs` with correct lifetimes. `DbContext` is scoped; never capture a scoped service in a singleton.
- Options pattern (`IOptions<T>`, `builder.Configuration`) for config; secrets from environment variables, user-secrets locally, or a vault. Never in `appsettings.json` committed to git.
- Validation via data annotations with `[ApiController]` automatic 400s, or FluentValidation if present.
- Errors as `ProblemDetails` (RFC 9457) through the project's exception handler / middleware.
- Authorization with `[Authorize]`, policies and resource-based `IAuthorizationService` for ownership checks.
- Background work with `IHostedService` / `BackgroundService` or the queue library already used (Hangfire, MassTransit).

## Coding standards

- `async`/`await` end to end; pass `CancellationToken` from the request down. Never `.Result` or `.Wait()` (deadlocks, thread starvation).
- Nullable reference types honored when `<Nullable>enable</Nullable>` is set; no `!` suppression to silence warnings without reason.
- `ILogger<T>` with message templates: `logger.LogInformation("Order {OrderId} created", id)`.
- `HttpClient` via `IHttpClientFactory` (typed or named clients), never `new HttpClient()` per request.
- EF Core: `AsNoTracking()` for read-only queries; project with `Select` to DTOs; `Include` to avoid N+1; watch client-side evaluation.

## Common security issues

- `FromSqlRaw` / `ExecuteSqlRaw` with concatenated input; use `FromSqlInterpolated` / `FromSql` (parameterized) or LINQ.
- Over-posting: binding request bodies directly to EF entities. Use DTOs.
- Missing `[Authorize]` on new controllers or endpoints when there is no global fallback policy.
- Permissive CORS (`AllowAnyOrigin` with credentials); disabled HTTPS redirection or HSTS in production config.
- Detailed exception pages (`UseDeveloperExceptionPage`) outside Development.
- `BinaryFormatter` or unsafe deserialization settings (`TypeNameHandling.All` in Newtonsoft.Json).

## Testing tools

- xUnit, NUnit or MSTest, with FluentAssertions/Shouldly and Moq/NSubstitute only if already referenced.
- Integration: `WebApplicationFactory<Program>` (Microsoft.AspNetCore.Mvc.Testing) with service overrides; Testcontainers for .NET if present; EF Core in-memory or SQLite only where the project already relies on it (they differ from real providers).

## Lint / format

- `dotnet format` honoring `.editorconfig`. Roslyn analyzers and `<TreatWarningsAsErrors>` per project settings; StyleCop if referenced.

## Build / validation commands (if configured)

```bash
dotnet restore
dotnet build --no-restore
dotnet test --no-build
dotnet format --verify-no-changes
dotnet ef migrations list           # only if the dotnet-ef tool is installed
```
Scope to a project or solution file when the repository holds several.

## Official docs

- ASP.NET Core: https://learn.microsoft.com/aspnet/core/
- EF Core: https://learn.microsoft.com/ef/core/
- .NET CLI: https://learn.microsoft.com/dotnet/core/tools/
- xUnit: https://xunit.net/ · NUnit: https://docs.nunit.org/
