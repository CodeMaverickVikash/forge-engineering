# Team Routing

Choose the **smallest team that covers the task's risks**. Never invoke every specialist. Add a specialist only when its "add when" condition is actually present in the code or the request. Record the chosen team and a one-line reason for each member in the spec.

## Roster

| Division | Agent | Owns |
|---|---|---|
| Intelligence | `forge-project-explorer` | Deep codebase mapping (read-only) |
| Product | `forge-product-manager` | Value, user stories, acceptance criteria, scope |
| Product | `forge-business-analyst` | Business rules, workflows, edge cases, data dependencies |
| Product | `forge-product-researcher` | Competitors, market, differentiation (web research) |
| Product | `forge-ux-designer` | Journeys, IA, layout, interaction, design-system consistency |
| Engineering | `forge-architect` | Architecture, patterns, ADRs, cross-module design |
| Engineering | `forge-frontend-engineer` | Web UI implementation (any framework) |
| Engineering | `forge-mobile-engineer` | React Native/Expo, Flutter, Android, iOS |
| Engineering | `forge-backend-engineer` | Services, business logic, server frameworks (any language) |
| Engineering | `forge-database-engineer` | Schema, migrations, queries, data integrity |
| Engineering | `forge-integration-engineer` | REST/GraphQL/WebSocket contracts, third parties, auth providers, payments, webhooks |
| Engineering | `forge-ai-engineer` | LLM integration, RAG, agents, inference |
| Engineering | `forge-devops-engineer` | Docker, K8s, CI/CD, cloud, IaC |
| Quality | `forge-qa-lead` | Test strategy, acceptance verification, regression scope |
| Quality | `forge-manual-qa` | Workflow walkthroughs, exploratory and edge-case checks (CLI/HTTP) |
| Quality | `forge-test-automation-engineer` | Unit, integration and E2E tests in the project's frameworks |
| Quality | `forge-browser-qa` | Playwright and Chrome DevTools MCP runtime verification |
| Quality | `forge-security-engineer` | OWASP, authN/Z, injection, secrets, dependencies |
| Quality | `forge-performance-engineer` | Latency, rendering, queries, memory, caching (measured) |
| Quality | `forge-accessibility-specialist` | WCAG 2.2 AA, keyboard, screen readers, contrast |
| Quality | `forge-code-reviewer` | Independent final review of the diff |
| Delivery | `forge-tech-writer` | README, API docs, ADRs, changelog entries |
| Delivery | `forge-release-engineer` | Release readiness, versioning, rollout and rollback plans |
| Delivery | `forge-sre` | Observability, SLOs, resilience, incident readiness |
| Delivery | `forge-dx-engineer` | Dev setup, scripts, tooling, onboarding friction |

## Routing matrix

`+` means core team for that task type. "Add when" lists conditional members. `forge-code-reviewer` always runs the final review for any task that changes code.

| Task type | Core team | Add when |
|---|---|---|
| **Bug fix (S)** | relevant engineer | `forge-test-automation-engineer` if no regression test pattern is obvious. `forge-browser-qa` if a browser-visible symptom exists |
| **Bug fix (M/L)** | `forge-business-analyst` + relevant engineer + `forge-qa-lead` | `forge-security-engineer` for auth, payments or data exposure. `forge-integration-engineer` for third-party or payment flows |
| **New feature** | `forge-product-manager` + `forge-business-analyst` + `forge-architect` + required engineers + `forge-qa-lead` + `forge-test-automation-engineer` | `forge-ux-designer` + `forge-browser-qa` for UI. `forge-database-engineer` for schema. `forge-security-engineer` for auth, PII or money |
| **UI/UX improvement** | `forge-product-manager` + `forge-ux-designer` + `forge-frontend-engineer` (or mobile) + `forge-browser-qa` | `forge-accessibility-specialist` for forms, navigation or new components. `forge-performance-engineer` for heavy pages |
| **API / integration / payments** | `forge-integration-engineer` + `forge-backend-engineer` + `forge-security-engineer` + `forge-qa-lead` | `forge-browser-qa` if the UI consumes it. `forge-business-analyst` for money or state machines |
| **Database change** | `forge-architect` + `forge-database-engineer` + `forge-backend-engineer` + `forge-qa-lead` | `forge-performance-engineer` for large tables or hot paths. `forge-sre` for production migration plans |
| **Security review / fix** | `forge-security-engineer` + relevant engineer + `forge-qa-lead` | `forge-integration-engineer` for OAuth, SSO or webhooks. `forge-devops-engineer` for secrets or infra |
| **Performance** | `forge-architect` + `forge-performance-engineer` + relevant engineer + `forge-qa-lead` | `forge-browser-qa` for frontend metrics. `forge-database-engineer` for query issues |
| **Mobile feature/fix** | `forge-mobile-engineer` + `forge-qa-lead` | `forge-ux-designer` for UI. `forge-integration-engineer` for push or deep links. `forge-backend-engineer` for API changes |
| **AI / LLM feature** | `forge-ai-engineer` + `forge-architect` + `forge-backend-engineer` + `forge-security-engineer` | `forge-performance-engineer` for latency or cost |
| **DevOps / deploy / CI** | `forge-devops-engineer` + `forge-release-engineer` | `forge-sre` for production. `forge-security-engineer` for secrets or IAM |
| **Project analysis / audit** | `forge-project-explorer` + `forge-architect` + `forge-security-engineer` + `forge-performance-engineer` | `forge-product-researcher` when product improvements were asked. `forge-accessibility-specialist` + `forge-browser-qa` for web apps. `forge-dx-engineer` for onboarding pain |
| **Production readiness** | `forge-architect` + `forge-security-engineer` + `forge-sre` + `forge-release-engineer` + `forge-qa-lead` | `forge-devops-engineer` for deploy config. `forge-performance-engineer` for scale. `forge-tech-writer` for runbooks |
| **Refactor / tech debt** | `forge-architect` + relevant engineer + `forge-test-automation-engineer` | `forge-qa-lead` for broad regression scope |
| **Tests / coverage** | `forge-qa-lead` + `forge-test-automation-engineer` | `forge-browser-qa` for E2E |
| **Documentation** | `forge-tech-writer` | `forge-dx-engineer` for setup guides |

## Selecting "relevant engineer"

Use the detected stack (`.forge/context.json`) and the affected paths:
- Web UI files → `forge-frontend-engineer`
- Mobile app (Expo, RN, Flutter, android/, ios/) → `forge-mobile-engineer`
- Server code, workers or CLIs → `forge-backend-engineer`
- Migrations, schema or ORM models → `forge-database-engineer`
- External API clients, webhooks or OAuth → `forge-integration-engineer`
- Dockerfiles, CI, IaC or k8s → `forge-devops-engineer`

## Parallelization

- **Parallel-safe:** read-only specialists (explorer, PM, BA, researcher, architect, security, performance, accessibility, QA lead) together, and implementers with **disjoint file ownership**.
- **Sequential:** anything that shares files, depends on a contract another agent is defining (define the contract first), or depends on test results.
- **Typical waves:** discovery (parallel) → architecture → implementation (parallel by owner) → verification (parallel) → review.
