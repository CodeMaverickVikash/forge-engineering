# Ruby backends (Rails)

## Identification

- `Gemfile` / `Gemfile.lock` with `rails`; `config/application.rb`, `bin/rails`, `app/`, `db/migrate/`.
- Ruby version from `.ruby-version`, `Gemfile` (`ruby "x.y.z"`) or `.tool-versions`.
- API-only apps: `config.api_only = true`. Other Ruby services may use Sinatra, Hanami or Roda; apply the same principles.

## Architecture practices

- RESTful resources in `config/routes.rb`; thin controllers; models for persistence and simple invariants; service objects, form objects or concerns for complex use cases (follow the existing pattern in `app/services` or similar).
- Authorization with the library in use (Pundit policies, CanCanCan abilities, Action Policy). Call it on every action; Pundit's `verify_authorized` after-action guards against omissions.
- Authentication via Devise, `has_secure_password`, or the Rails authentication generator, as present.
- Background jobs through Active Job with the configured adapter (Sidekiq, Solid Queue, GoodJob). Pass record IDs, not records.
- Multi-record writes in `ActiveRecord::Base.transaction`. Avoid side effects (emails, HTTP) inside transactions or `after_save` callbacks; use `after_commit`.
- Config via `config/credentials.yml.enc` and environment variables; never commit `master.key`.
- JSON shaping with the serializer already used (Jbuilder, ActiveModel::Serializers, Alba, Blueprinter).

## Coding standards

- Follow RuboCop config and Rails conventions (naming, folder layout).
- Avoid N+1 with `includes`/`preload`/`eager_load`; `strict_loading` where the project enables it. The Bullet gem may be present in development.
- Batch iteration with `find_each` / `in_batches` for large tables.
- `Rails.logger` with tagged logging / request IDs; filter sensitive params via `config.filter_parameters`.
- Keep callbacks small; prefer explicit service calls for business flows.

## Common security issues

- **Strong parameters**: always `params.require(:model).permit(...)`; never `permit!` or `params.to_unsafe_h` into `create`/`update`.
- SQL injection via string interpolation in `where("name = '#{x}'")`, `order(params[:sort])`, `pluck` with raw SQL. Use hash conditions, placeholders, or an allowlist for sort columns.
- Scoping: `Post.find(params[:id])` instead of `current_user.posts.find(params[:id])` (IDOR).
- `html_safe` / `raw` on user content; `render inline:` with user input; `send`/`constantize` on params.
- Open redirects via `redirect_to params[:url]`; missing `protect_from_forgery` in cookie-session apps.
- Brakeman flags most of these; run it if installed.

## Testing tools

- RSpec (`spec/`, `rails_helper.rb`) with request specs for APIs, or Minitest (`test/`) with integration tests.
- factory_bot or fixtures, as present; WebMock/VCR for outbound HTTP if present.
- Active Job test helpers (`have_enqueued_job`, `perform_enqueued_jobs`).

## Lint / format / security scan

- RuboCop (`.rubocop.yml`), including `rubocop-rails` / `rubocop-rspec` when configured; Standard if used instead.
- Brakeman for static security analysis; bundler-audit for vulnerable gems.

## Build / validation commands (if configured)

```bash
bundle exec rspec                  # RSpec
bin/rails test                     # Minitest
bundle exec rubocop
bundle exec brakeman --no-pager    # if the gem is installed
bin/rails db:migrate:status        # local DB only
```
Check `bin/` for project scripts (`bin/ci`, `bin/setup`) first.

## Official docs

- Rails Guides: https://guides.rubyonrails.org/
- Rails API: https://api.rubyonrails.org/
- RSpec: https://rspec.info/ · RuboCop: https://docs.rubocop.org/
- Brakeman: https://brakemanscanner.org/docs/
