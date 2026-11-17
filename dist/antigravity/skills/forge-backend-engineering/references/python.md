# Python backends (FastAPI, Django, Flask)

## Identification

- Manifests: `pyproject.toml`, `requirements*.txt`, `setup.py`, `Pipfile`. Framework from dependencies: `fastapi`, `django` (plus `manage.py`), `flask`.
- Environment manager from lockfiles and config: `uv.lock` (uv), `poetry.lock` or `[tool.poetry]` (Poetry), `Pipfile.lock` (Pipenv), plain `requirements.txt` (pip + venv). Use only the one the project uses.
- Python version: `requires-python` in `pyproject.toml`, `.python-version`, or the CI matrix.

## Architecture practices

- **FastAPI**: routers per resource (`APIRouter`), Pydantic models for request and response (`response_model`), dependencies (`Depends`) for DB sessions, auth and current user. Keep business logic in service modules, not in path functions. Do not call blocking I/O inside `async def` endpoints; use `def` endpoints or async drivers.
- **Django**: apps per bounded area; models, forms or DRF serializers for validation; views or viewsets thin; business logic in services or model methods following the project's convention. Use `select_related` / `prefetch_related` to avoid N+1. Use `transaction.atomic` for multi-write operations.
- **Flask**: blueprints, application factory, extensions (Flask-SQLAlchemy, Flask-Login, Marshmallow) as already installed. Use the request-scoped session pattern the project already has.
- Validation: Pydantic, DRF serializers, Marshmallow, or Django forms. Reuse whichever exists.
- Settings via environment: `pydantic-settings`, `django-environ`, or the project's settings module. Never commit secrets in `settings.py`.

## Coding standards

- Type hints on public functions; match the project's mypy or pyright strictness.
- Prefer explicit exceptions mapped to HTTP errors in one place (exception handlers, DRF exception handler, Flask `errorhandler`).
- Use `logging` (or `structlog` if present) with the module logger: `logger = logging.getLogger(__name__)`. No `print`.
- Timezone-aware datetimes (`datetime.now(timezone.utc)`, Django `timezone.now()`).
- Avoid mutable default arguments; avoid import-time side effects such as DB connections.

## Common security issues

- Raw SQL via f-strings or `%` formatting; use parameters (`cursor.execute(sql, params)`, SQLAlchemy `text()` with bound params, Django ORM).
- Django: `extra()`/`raw()` with user input, `mark_safe` on user content, `DEBUG = True` or wildcard `ALLOWED_HOSTS` in production settings, CSRF exemptions without cause.
- DRF: missing `permission_classes`, querysets not filtered by owner (IDOR), serializers with `fields = "__all__"` exposing internal columns.
- `pickle`/`yaml.load` on untrusted data (use `yaml.safe_load`); `subprocess` with `shell=True`; SSRF via `requests` to user-supplied URLs.
- Flask: `SECRET_KEY` hardcoded, `debug=True` in deployed config.

## Testing tools

- pytest (with `pytest-django`, `pytest-asyncio`, `anyio` as configured) or `unittest` / Django's `manage.py test`.
- FastAPI: `TestClient` or `httpx.AsyncClient` with dependency overrides (`app.dependency_overrides`).
- Django: `django.test.Client`, DRF `APIClient`; factories via `factory_boy` if present.
- Flask: `app.test_client()` from the application factory.

## Lint / format / typecheck

- Ruff (`ruff check`, `ruff format`) configured in `pyproject.toml` or `ruff.toml`; or Black, isort and Flake8 if those are what the project uses.
- mypy or pyright for types, only when configured.

## Build / validation commands (if configured)

Run through the project's environment manager:
```bash
uv run pytest                 # uv
poetry run pytest             # Poetry
python -m pytest              # pip + activated venv
python manage.py test         # Django without pytest
ruff check . && ruff format --check .
mypy <package>                # if configured
python manage.py makemigrations --check --dry-run   # Django: detects missing migrations
```

## Official docs

- Python: https://docs.python.org/3/
- FastAPI: https://fastapi.tiangolo.com/
- Django: https://docs.djangoproject.com/
- Flask: https://flask.palletsprojects.com/
- uv: https://docs.astral.sh/uv/ · Ruff: https://docs.astral.sh/ruff/
