---
name: forge-devops-cloud
description: Containers, CI/CD, Kubernetes, cloud platforms and infrastructure as code for any stack. Covers Docker and compose best practice, probes and resources, pipeline caching and least privilege, environment config, Terraform plan-only review, and the safety rules for deploys and cloud changes.
user-invocable: false
---

# DevOps & Cloud

Make build, ship and run config correct, secure, reproducible and boring. **Nothing in this skill authorizes deploying, applying infrastructure, or touching cloud resources.** Those need explicit user authorization relayed by the orchestrator.

## 1. Discover what is actually used

From `.forge/context.json` and the repo: `Dockerfile*`, `docker-compose*.yml`/`compose*.yaml`, `.dockerignore`, `k8s/`, Helm charts, Kustomize, `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `.circleci/`, `*.tf`, Pulumi, CDK, Bicep/ARM, `serverless.yml`, `vercel.json`, `netlify.toml`, `fly.toml`, `railway.json`/`railway.toml`, `render.yaml`, `app.yaml`, `Procfile`. Don't introduce a new platform or tool when the project already has one. Infer the target platform from evidence, never from assumption.

## 2. Docker

- **Multi-stage builds:** build tools and dev dependencies in a builder stage; the runtime stage copies only artifacts.
- **Small, pinned base images:** a specific tag (slim, alpine or distroless when compatible), never `latest`. Digest pinning where the project does it.
- **Layer caching:** copy manifests and lockfiles, install dependencies, then copy the source. Use the lockfile install (`npm ci`, `pip install -r`, `bundle install` with the lockfile, `go mod download`).
- **Non-root:** create or use an unprivileged `USER`; no `--privileged`; read-only filesystem where possible.
- **`.dockerignore`:** exclude `.git`, `node_modules`, build output, `.env*`, local secrets, test artifacts.
- **No secrets in images:** no `ENV`/`ARG` with secret values, no copied `.env`; use build secrets or runtime env injection.
- Use an exec-form `CMD`/`ENTRYPOINT` so signals reach the process; graceful shutdown on SIGTERM. A `HEALTHCHECK` where the orchestrator uses it.
- Validate locally when Docker is available: `docker build` (local, non-destructive). Note image size before and after for size work.

## 3. Compose (local development)

Named volumes for data, healthchecks with `depends_on: condition: service_healthy` where supported, env from `env_file` pointing at an example template (never committed secrets), ports bound to localhost for dev databases. Validate with `docker compose config` if Docker is present.

## 4. Kubernetes basics

- Readiness probe (ready for traffic), liveness probe (restart if stuck; don't point it at dependencies), startup probe for slow boots.
- `resources.requests` and `limits` set; memory limit consistent with runtime heap settings.
- Config in ConfigMaps; secrets in Secrets or an external secret manager, never in plain manifests or git.
- `securityContext`: `runAsNonRoot`, `allowPrivilegeEscalation: false`, drop capabilities. Multiple replicas plus a PodDisruptionBudget for availability; rolling update strategy with sane `maxUnavailable`.
- Validate offline only: `kubectl apply --dry-run=client -f <file>`, `kubectl kustomize`, `helm template`/`helm lint` (if installed). Never run commands against a live cluster without authorization.

## 5. CI/CD

- **Required checks:** install with the lockfile, then lint, typecheck, test and build, failing fast; the same commands developers run locally.
- **Caching:** dependency caches keyed on the lockfile hash; build caches where supported.
- **Pinned actions:** third-party GitHub Actions pinned to a full commit SHA (or at least a version tag, per project convention); pinned runner images and tool versions.
- **Least privilege:** top-level `permissions:` set to the minimum (e.g. `contents: read`), elevated per job only where needed; OIDC federation over long-lived cloud keys; secrets only in protected branches or environments; never echo secrets; be careful with `pull_request_target` and untrusted input in `run:` scripts (script injection via `${{ github.event.* }}`).
- **Deploy jobs:** gated on protected branches or environments with required approvals; build once, promote the same artifact.
- Validate workflow syntax with a linter only if installed (e.g. `actionlint`); otherwise review carefully and say it was not executed. CI cannot be run locally in general, so report it as `NOT RUN`.
- Changing CI pipelines beyond the task's need is a project-wide config change and requires authorization.

## 6. Cloud platforms and IaC

- **Terraform:** `terraform fmt -check`, `terraform validate`, and `terraform plan` only when credentials and state access are already configured and the user authorized it. **Never `terraform apply`, `destroy`, `import` or state manipulation.** Review the plan output for destroys or replacements and call them out.
- The same rule applies to Pulumi (`preview` only), CDK (`synth`/`diff` only), Bicep/ARM (what-if only), and platform CLIs (`vercel`, `fly`, `netlify`, `railway`, `aws`, `az`, `gcloud`): **read-only commands at most, never deploy, scale, delete or create resources.**
- IaC hygiene: remote state with locking, no secrets in variables files committed to git, tagged resources, least-privilege IAM (no `*` actions or resources without justification), encryption at rest and in transit enabled, no public buckets or databases by default.
- Flag cost-impacting changes (instance sizes, replicas, managed services, egress) in the report.

## 7. Environment and config management

- Twelve-factor style: config from the environment, validated at startup with a clear error naming the missing variable (never printing its value).
- Keep `.env.example` (or the project's equivalent) in sync with new variable **names**, with safe placeholder values.
- Separate config per environment; no prod values in dev defaults; feature flags through the project's existing mechanism.

## Safety

Never without explicit authorization: deploys, `terraform apply`, `kubectl apply` against a cluster, pushing images to registries, creating or changing cloud resources, DNS or IAM changes, rotating production secrets, or anything that costs money. Prepare the change and the exact commands, and hand them to the user.

## Output

Files changed and why; validation commands run with status (e.g. `docker build` PASSED, `terraform plan` NOT RUN: no credentials); commands prepared for the user to run themselves (deploy or apply) with their expected effect; security, cost and downtime risks; and any secrets or env variable **names** the user must provide.
