# PHP backends (Laravel, Symfony)

## Identification

- `composer.json` with `laravel/framework` (plus an `artisan` file) or `symfony/framework-bundle` (plus `bin/console`).
- PHP version from `require.php` in `composer.json`, `.php-version`, Docker images or CI.
- Laravel structure: `app/Http/Controllers`, `app/Models`, `routes/*.php`, `database/migrations`, `config/`. Symfony: `src/Controller`, `src/Entity`, `config/`, `migrations/`.

## Architecture practices

- **Laravel**: thin controllers; validation in Form Requests (`rules()`, `authorize()`); authorization via Policies and Gates (`$this->authorize()`, `can` middleware); business logic in services or actions per project convention; API Resources for response shaping; Jobs on queues for slow work; Events/Listeners where already used.
- **Symfony**: controllers delegate to services wired by autowiring; validation via the Validator component (attributes on DTOs); Voters for resource authorization; Doctrine repositories for queries; Messenger for async work.
- Config via `config/*.php` reading `env()` (Laravel) or `%env()%` parameters (Symfony). In Laravel, call `env()` only inside config files; code reads `config()` so config caching works.
- Database writes spanning multiple tables go in `DB::transaction()` (Laravel) or an explicit Doctrine transaction.

## Coding standards

- `declare(strict_types=1);` where the project uses it; typed properties, parameters and return types.
- PSR-12 / PER coding style through the project's formatter.
- Eager load relations (`with()`, `load()`) for lists; enable `Model::preventLazyLoading()` in non-production if the project allows it.
- Use `chunk()`/`chunkById()`/`lazy()` for large iterations instead of `all()`.
- Return consistent JSON errors from the exception handler; do not `dd()` or `dump()` in committed code.

## Common security issues

- **Mass assignment**: never `Model::create($request->all())`. Use `$request->validated()` with `$fillable` (or tightly scoped `$guarded`). Never set `$guarded = []` on models that receive user input.
- Raw queries with interpolation (`DB::raw`, `whereRaw`, `DB::select` with string concatenation); use bindings.
- Blade `{!! !!}` on user content (XSS); Twig `|raw` likewise.
- Missing policy checks on show/update/delete routes (IDOR); route model binding does not authorize by itself.
- `APP_DEBUG=true` or exposed `.env` in deployed environments; weak `APP_KEY` handling.
- `unserialize()` on user input; file uploads without MIME and size validation or stored under the public web root.

## Testing tools

- Pest or PHPUnit (`phpunit.xml` / `phpunit.xml.dist`). Laravel feature tests with `$this->getJson()`, `actingAs()`, `assertStatus()`, `assertJsonPath()`; `RefreshDatabase` or `DatabaseTransactions` traits; model factories.
- Symfony: `WebTestCase` / `KernelTestCase`, Foundry or fixtures if present.
- Fakes: `Queue::fake()`, `Mail::fake()`, `Http::fake()`, `Event::fake()` in Laravel.

## Lint / format / static analysis

- Laravel Pint (`pint.json`), PHP-CS-Fixer (`.php-cs-fixer.php`), PHP_CodeSniffer (`phpcs.xml`).
- PHPStan (`phpstan.neon`) or Larastan (PHPStan extension for Laravel), Psalm (`psalm.xml`).

## Build / validation commands (if configured)

```bash
php artisan test                     # Laravel; wraps PHPUnit/Pest
vendor/bin/pest                      # or vendor/bin/phpunit
vendor/bin/pint --test               # check-only formatting
vendor/bin/phpstan analyse           # PHPStan / Larastan
php bin/console lint:container       # Symfony container check
composer validate                    # manifest sanity
```
Prefer the `scripts` section of `composer.json` when it defines test or lint targets.

## Official docs

- Laravel: https://laravel.com/docs
- Symfony: https://symfony.com/doc/current/index.html
- PHP manual: https://www.php.net/manual/en/
- Pest: https://pestphp.com/docs · PHPStan: https://phpstan.org/user-guide/getting-started
