import { SpecialistAgent, QualityGate, ProjectContext, TaskItem, ExecutionEvent, FileChange, ReviewSection } from '../types';

export const FORGE_LIFECYCLE_PHASES = [
  { phase: 1, name: 'Understand', shortDesc: 'Classify task type, size (Q/S/M/L) and assess security/data risk' },
  { phase: 2, name: 'Explore', shortDesc: 'Fast stack detector + evidence inspection into .forge/context.json' },
  { phase: 3, name: 'Specify', shortDesc: 'Prompt enhancement into spec.md (grounded single source of truth)' },
  { phase: 4, name: 'Architect', shortDesc: 'Routing matrix selects smallest specialist team + ADR generation' },
  { phase: 5, name: 'Plan', shortDesc: 'Ordered tasks with disjoint file ownership and validation strategy' },
  { phase: 6, name: 'Implement', shortDesc: 'Parallel native specialist subagents executing on disjoint files' },
  { phase: 7, name: 'Verify', shortDesc: 'G1–G15 quality gates batch + Pre-browser gate + Playwright & DevTools' },
  { phase: 8, name: 'Fix', shortDesc: 'Root-cause remediation loop (max 3 cycles) with delta retests' },
  { phase: 9, name: 'Final Check', shortDesc: 'Scope verification + G13 independent code review on Opus for sensitive files' },
  { phase: 10, name: 'Report', shortDesc: 'Saved engineering report with evidence + Zero unapproved git commits' },
];

export const FORGE_SPECIALISTS: SpecialistAgent[] = [
  // Product Division
  {
    id: 'forge-product-manager',
    name: 'forge-product-manager',
    division: 'Product',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Defines user stories, acceptance criteria, scope boundaries, and ensures product value delivery.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-prompt-enhancement'],
    responsibilities: ['Acceptance criteria definition', 'Scope pruning & risk flags', 'Requirement ambiguity reduction']
  },
  {
    id: 'forge-business-analyst',
    name: 'forge-business-analyst',
    division: 'Product',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Extracts intricate business rules, state machines, regulatory requirements, and edge case flows directly from code.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-project-exploration'],
    responsibilities: ['Domain rule modeling', 'Workflow edge case mapping', 'Data transition analysis']
  },
  {
    id: 'forge-product-researcher',
    name: 'forge-product-researcher',
    division: 'Product',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 40,
    description: 'Conducts competitor, ecosystem, and industry pattern research with verified citations.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill', 'WebSearch', 'WebFetch'],
    preloadedSkills: ['forge-project-exploration'],
    responsibilities: ['API ecosystem benchmarking', 'Design pattern comparison', 'Cited technical research']
  },
  {
    id: 'forge-ux-designer',
    name: 'forge-ux-designer',
    division: 'Product',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Formulates buildable UI/UX specifications, user journeys, microcopy, responsive layouts, and empty/loading states.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-frontend-engineering'],
    responsibilities: ['User journey wireframes', 'State hierarchy specs', 'Interaction feedback guidelines']
  },

  // Architecture & Engineering Division
  {
    id: 'forge-architect',
    name: 'forge-architect',
    division: 'Architecture & Engineering',
    model: 'inherit',
    modelTierDescription: 'Main Model (strong tier)',
    maxTurns: 30,
    description: 'Designs resilient system architectures, evaluates trade-offs, freezes contracts, and authors Architectural Decision Records (ADR).',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill', 'WebSearch'],
    preloadedSkills: ['forge-architect'],
    responsibilities: ['Architecture Decision Records (ADRs)', 'Cross-boundary contract freezing', 'Scalability & resilience models']
  },
  {
    id: 'forge-backend-engineer',
    name: 'forge-backend-engineer',
    division: 'Architecture & Engineering',
    model: 'inherit',
    modelTierDescription: 'Main Model (strong tier)',
    maxTurns: 60,
    description: 'Constructs robust APIs, microservices, background queues, transactional workers, and CLI commands in any backend stack.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-backend-engineering'],
    responsibilities: ['REST, GraphQL, gRPC handlers', 'Job queue processors', 'Transactional business logic']
  },
  {
    id: 'forge-frontend-engineer',
    name: 'forge-frontend-engineer',
    division: 'Architecture & Engineering',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 60,
    description: 'Builds modular, responsive, high-performance web components with strict state management and accessibility.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-frontend-engineering'],
    responsibilities: ['Component hierarchy & styling', 'Interactive state machines', 'Responsive layouts & animations']
  },
  {
    id: 'forge-mobile-engineer',
    name: 'forge-mobile-engineer',
    division: 'Architecture & Engineering',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 60,
    description: 'Engineers cross-platform mobile experiences across React Native, Expo, Flutter, iOS, and Android.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-mobile-engineering'],
    responsibilities: ['Mobile views & navigation', 'Native bridge integrations', 'Offline storage & sync']
  },
  {
    id: 'forge-database-engineer',
    name: 'forge-database-engineer',
    division: 'Architecture & Engineering',
    model: 'inherit',
    modelTierDescription: 'Main Model (strong tier)',
    maxTurns: 60,
    description: 'Authors safe zero-downtime database migrations, indexes, relational/NoSQL schemas, and query optimizations.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-database-engineering'],
    responsibilities: ['Zero-downtime migrations', 'Index analysis & query plans', 'Referential integrity enforcement']
  },
  {
    id: 'forge-integration-engineer',
    name: 'forge-integration-engineer',
    division: 'Architecture & Engineering',
    model: 'inherit',
    modelTierDescription: 'Main Model (strong tier)',
    maxTurns: 60,
    description: 'Specializes in third-party integrations, OAuth/OIDC, webhook idempotency, payment gateways (Stripe), and external APIs.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-integration-engineering'],
    responsibilities: ['Payment processing & webhooks', 'OAuth2/OIDC handshakes', 'Rate-limiting & retry backoff']
  },
  {
    id: 'forge-ai-engineer',
    name: 'forge-ai-engineer',
    division: 'Architecture & Engineering',
    model: 'inherit',
    modelTierDescription: 'Main Model (strong tier)',
    maxTurns: 60,
    description: 'Implements production-grade LLM integrations, deterministic structured output pipelines, RAG systems, and evals.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill', 'WebFetch'],
    preloadedSkills: ['forge-ai-engineering'],
    responsibilities: ['RAG vector pipelines', 'Structured JSON schemas & tool use', 'Prompt guardrails & eval suites']
  },
  {
    id: 'forge-devops-engineer',
    name: 'forge-devops-engineer',
    division: 'Architecture & Engineering',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 60,
    description: 'Configures Docker, Kubernetes, GitHub Actions CI/CD workflows, Terraform, and IaC configurations safely locally.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-devops-engineering'],
    responsibilities: ['Multi-stage Docker builds', 'CI/CD pipeline matrices', 'Infrastructure-as-code manifests']
  },

  // Quality Division
  {
    id: 'forge-qa-lead',
    name: 'forge-qa-lead',
    division: 'Quality',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Designs risk-weighted test strategies, Acceptance-Criteria-to-Evidence matrices, and exit gates.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-qa-strategy'],
    responsibilities: ['Risk-weighted test matrix', 'Exit criteria definitions', 'Verification gate readiness']
  },
  {
    id: 'forge-test-automation-engineer',
    name: 'forge-test-automation-engineer',
    division: 'Quality',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 60,
    description: 'Authors deterministic unit, integration, and contract tests with zero flaky assertions.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-test-automation'],
    responsibilities: ['Deterministic regression tests', 'Mock & fixture generation', 'Flake triage & isolation']
  },
  {
    id: 'forge-browser-qa',
    name: 'forge-browser-qa',
    division: 'Quality',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 70,
    description: 'Executes live multi-step user journeys in real Chromium browser via Playwright + Chrome DevTools MCP.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill', 'DevTools', 'Playwright'],
    preloadedSkills: ['forge-browser-qa'],
    responsibilities: ['Interactive UI journey checks', 'DevTools console error detection', 'Indexed screenshot captures']
  },
  {
    id: 'forge-manual-qa',
    name: 'forge-manual-qa',
    division: 'Quality',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 40,
    description: 'Simulates chaotic real-world inputs, edge cases, and CLI exploratory probing to reproduce regressions.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-debugging'],
    responsibilities: ['Boundary value fuzzing', 'CLI edge case discovery', 'Reproduction script generation']
  },
  {
    id: 'forge-code-reviewer',
    name: 'forge-code-reviewer',
    division: 'Quality',
    model: 'inherit',
    modelTierDescription: 'Escalates to Opus on Sensitive Code',
    maxTurns: 45,
    description: 'Conducts strict, adversarial, independent code review of uncommitted diffs against original specification.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-code-review'],
    responsibilities: ['Adversarial diff inspection', 'Spec fidelity audit', '13-section review verdict authoring']
  },
  {
    id: 'forge-accessibility-specialist',
    name: 'forge-accessibility-specialist',
    division: 'Quality',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Audits user interfaces against WCAG 2.2 AA standards, keyboard navigation, focus traps, and ARIA roles.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-accessibility'],
    responsibilities: ['WCAG 2.2 AA compliance audits', 'Keyboard navigation trapping checks', 'Screen reader semantics verification']
  },
  {
    id: 'forge-performance-engineer',
    name: 'forge-performance-engineer',
    division: 'Quality',
    model: 'inherit',
    modelTierDescription: 'Main Model (strong tier)',
    maxTurns: 40,
    description: 'Pinpoints real bottlenecks with profiling metrics, memory leak tracking, and before/after verification.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-performance-optimization'],
    responsibilities: ['Bottleneck profiling', 'Memory footprint reduction', 'Quantified latency comparisons']
  },
  {
    id: 'forge-security-engineer',
    name: 'forge-security-engineer',
    division: 'Quality',
    model: 'inherit',
    modelTierDescription: 'Escalates to Opus on Auth/Crypto/PII',
    maxTurns: 40,
    description: 'Threat models attack surfaces, conducts OWASP Top 10 scans, and audits authentication, PII, and cryptographic routines.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill', 'WebSearch'],
    preloadedSkills: ['forge-security-review'],
    responsibilities: ['STRIDE threat modeling', 'OWASP vulnerability detection', 'Token & cryptographic validation']
  },

  // Delivery Division
  {
    id: 'forge-release-engineer',
    name: 'forge-release-engineer',
    division: 'Delivery',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Audits release readiness, semantic versioning increments, change logs, and rollback procedures.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-release-engineering'],
    responsibilities: ['Release readiness verification', 'Rollout & rollback contingency', 'Changelog accuracy check']
  },
  {
    id: 'forge-sre',
    name: 'forge-sre',
    division: 'Delivery',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Reviews observability instrumentation, Prometheus metrics, structured logs, and service health endpoints.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-sre'],
    responsibilities: ['SLO & alert threshold definitions', 'Healthcheck probe validation', 'Resilience scorecard creation']
  },
  {
    id: 'forge-tech-writer',
    name: 'forge-tech-writer',
    division: 'Delivery',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 40,
    description: 'Synchronizes API docs, READMEs, architectural summaries, and inline documentation with implemented changes.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-tech-writing'],
    responsibilities: ['API contract documentation', 'README & runbook synchronization', 'Codebase comment hygiene']
  },
  {
    id: 'forge-dx-engineer',
    name: 'forge-dx-engineer',
    division: 'Delivery',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 40,
    description: 'Optimizes developer velocity, build times, package manager scripts, and task runner configurations.',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-dx'],
    responsibilities: ['Dev server boot time reduction', 'Script orchestration', 'Local sandbox ergonomics']
  },

  // Intelligence Division
  {
    id: 'forge-project-explorer',
    name: 'forge-project-explorer',
    division: 'Intelligence',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 30,
    description: 'Builds read-only, evidence-grounded maps of unfamiliar repositories and identifies key architectural patterns.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill'],
    preloadedSkills: ['forge-project-exploration'],
    responsibilities: ['Codebase architecture mapping', 'Module dependency graph', 'Framework convention discovery']
  },
  {
    id: 'forge-skill-scout',
    name: 'forge-skill-scout',
    division: 'Intelligence',
    model: 'sonnet',
    modelTierDescription: 'Sonnet (standard tier)',
    maxTurns: 40,
    description: 'Discovers verified open-source skills for specific stack gaps; never installs anything without explicit user approval.',
    tools: ['Read', 'Grep', 'Glob', 'Bash', 'Skill', 'WebSearch'],
    preloadedSkills: ['forge-skill-discovery'],
    responsibilities: ['Open-source skill discovery', 'License compliance audit', 'Human-gated approval preparation']
  }
];

export const FORGE_QUALITY_GATES: QualityGate[] = [
  { id: 'G1', name: 'Syntax & Formatting', description: 'Clean compilation with zero syntax defects and consistent formatting', category: 'Static Analysis', status: 'PASSED', executionTime: '1.2s', evidence: 'prettier --check . passed without violations', blockingPreBrowser: true },
  { id: 'G2', name: 'Type Safety', description: 'Zero TypeScript or language compiler type errors across all units', category: 'Static Analysis', status: 'PASSED', executionTime: '3.4s', evidence: 'tsc --noEmit returned 0 errors across 14 modules', blockingPreBrowser: true },
  { id: 'G3', name: 'Static Linting', description: 'Zero ESLint/static analysis errors; warnings inspected', category: 'Static Analysis', status: 'PASSED', executionTime: '2.8s', evidence: 'eslint --max-warnings 0 passed cleanly', blockingPreBrowser: true },
  { id: 'G4', name: 'Unit Tests', description: 'All unit test suites execute and pass with zero regressions', category: 'Automated Tests', status: 'PASSED', executionTime: '4.6s', evidence: 'vitest run: 42 passed, 0 failed, 0 flaky', blockingPreBrowser: true },
  { id: 'G5', name: 'Integration Tests', description: 'Cross-module service contracts and database handlers verified', category: 'Automated Tests', status: 'PASSED', executionTime: '6.1s', evidence: 'API contract test suite passed with mock DB instance', blockingPreBrowser: true },
  { id: 'G6', name: 'Regression Defense', description: 'Smallest reproducible test written specifically for the target task', category: 'Automated Tests', status: 'PASSED', executionTime: '1.5s', evidence: 'tests/unit/notifications.test.ts verifies fixed edge cases', blockingPreBrowser: true },
  { id: 'G7', name: 'Secret & Credential Scan', description: 'Verifies no tokens, secrets, or .env strings leaked into code or reports', category: 'Security & Risk', status: 'PASSED', executionTime: '0.8s', evidence: 'Entropy scan + regex detected 0 high-entropy keys', blockingPreBrowser: true },
  { id: 'G8', name: 'OWASP & Dependency Safety', description: 'Checks for known CVEs, injection vectors, and prototype pollution', category: 'Security & Risk', status: 'PASSED', executionTime: '1.9s', evidence: 'npm audit --audit-level=high: 0 vulnerabilities found', blockingPreBrowser: true },
  { id: 'G9', name: 'Pre-Browser Gate', description: 'Hard gating barrier: blocks browser testing until G1-G8 pass completely', category: 'Browser & UX', status: 'PASSED', executionTime: '0.2s', evidence: 'validation-gate.mjs gate: OPEN (exit code 0)', blockingPreBrowser: true },
  { id: 'G10', name: 'Playwright Journey QA', description: 'Simulates real browser user journeys and DOM interactions', category: 'Browser & UX', status: 'PASSED', executionTime: '8.4s', evidence: '3 user journeys succeeded; screenshots indexed in evidence/', blockingPreBrowser: false },
  { id: 'G11', name: 'Chrome DevTools MCP Logs', description: 'Inspects real-time browser console errors, failed network calls, and TTFB', category: 'Browser & UX', status: 'PASSED', executionTime: '2.1s', evidence: '0 uncaught console errors; 0 failed 4xx/5xx requests', blockingPreBrowser: false },
  { id: 'G12', name: 'Accessibility (WCAG 2.2 AA)', description: 'Audits color contrast, focus rings, ARIA roles, and screen-reader labels', category: 'Browser & UX', status: 'PASSED', executionTime: '1.7s', evidence: 'Axe-core run: 0 critical/serious accessibility violations', blockingPreBrowser: false },
  { id: 'G13', name: 'Independent Code Review', description: 'Unbiased adversarial diff audit against spec by forge-code-reviewer', category: 'Review & Integrity', status: 'PASSED', executionTime: '12.0s', evidence: 'Opus tier review verdict: APPROVED with 0 blocking remarks', blockingPreBrowser: false },
  { id: 'G14', name: 'Git Guard Enforced', description: 'Validates that zero git commit, push, or pull request operations occurred', category: 'Review & Integrity', status: 'PASSED', executionTime: '0.4s', evidence: 'Working tree contains 5 uncommitted files for user review', blockingPreBrowser: false },
  { id: 'G15', name: 'Evidence Index Complete', description: 'Full execution summary, logs, screenshots, and diff stats linked in report', category: 'Review & Integrity', status: 'PASSED', executionTime: '0.6s', evidence: '.forge/tasks/notification-badge/report.md generated', blockingPreBrowser: false },
];

export const SAMPLE_PROJECT_CONTEXT: ProjectContext = {
  name: 'forge-runtime-orchestrator',
  repository: 'github.com/forge-eng/skills-agent',
  branch: 'main',
  stack: {
    runtime: 'Node.js v24.22.1 / ESM',
    languages: ['TypeScript 5.7', 'JavaScript (Node.js)', 'Python 3.12'],
    frameworks: ['React 19', 'Tailwind CSS 3.4', 'Vite 6.1', 'Next.js 15'],
    packageManager: 'pnpm 12.15.0',
    testRunners: ['Vitest 2.1', 'Playwright 1.49'],
    browserQA: 'Chrome DevTools MCP + Playwright headless engine'
  },
  detectedSignatures: 116,
  durableKnowledge: [
    {
      title: 'Disjoint File Ownership Rule',
      convention: 'Parallel implementers must only modify distinct file trees. Shared files require single-owner serialization.',
      source: 'skills/forge/core/delegation.md#file-ownership',
      lastVerified: '2 hours ago'
    },
    {
      title: 'Strict Autonomy & Git Guard',
      convention: 'Never run git commit, push, merge, rebase, or PR creation. Changes remain in working tree for developer verification.',
      source: 'docs/security.md',
      lastVerified: 'Today'
    },
    {
      title: 'Pre-Browser Gate Mandate',
      convention: 'Static checks, type checks, linting, and unit tests must pass completely before initiating browser journeys.',
      source: 'skills/forge/core/quality-gates.md',
      lastVerified: 'Yesterday'
    },
    {
      title: 'Model Escalation Policy',
      convention: 'Auth, payment, cryptography, and schema migrations automatically escalate code reviews to Opus.',
      source: 'skills/forge/core/delegation.md#model-escalation',
      lastVerified: 'Today'
    }
  ],
  gitState: {
    clean: false,
    uncommittedDiffs: 4,
    headSha: '8d2a10e',
    guardActive: true
  }
};

export const SAMPLE_TASKS: TaskItem[] = [
  {
    id: 'task-101',
    slug: 'live-notification-center',
    title: 'Implement real-time WebSocket notification center with unread badge counter',
    request: '/forge Build real-time notification badge with dropdown menu and sound toggle',
    status: 'VERIFIED',
    size: 'M',
    phase: 10,
    phaseName: 'Report',
    specialists: ['forge-frontend-engineer', 'forge-backend-engineer', 'forge-browser-qa', 'forge-code-reviewer'],
    startedAt: '18 minutes ago',
    completedAt: '2 minutes ago',
    filesChanged: 5,
    gatesPassed: 15,
    totalGates: 15,
    summary: 'Constructed NotificationBell dropdown, unread count polling with SSE fallback, audio toggle state, and verified Playwright user interaction journeys with zero console errors.',
    branch: 'feat/notifications',
    commitGuard: 'ENFORCED',
    evidenceCount: 4,
    modelEscalated: false
  },
  {
    id: 'task-102',
    slug: 'stripe-webhook-idempotency',
    title: 'Harden Stripe webhook processing with Redis idempotency locks and replay defense',
    request: '/forge Fix duplicate payment charges during Stripe webhook retries',
    status: 'VERIFIED WITH LIMITATIONS',
    size: 'M',
    phase: 10,
    phaseName: 'Report',
    specialists: ['forge-integration-engineer', 'forge-database-engineer', 'forge-security-engineer', 'forge-code-reviewer'],
    startedAt: '1 hour ago',
    completedAt: '35 minutes ago',
    filesChanged: 3,
    gatesPassed: 14,
    totalGates: 15,
    summary: 'Integrated atomic Redis idempotency keys (TTL 86400s) and verified signature tampering defense. Independent code review escalated to Opus for financial transaction paths.',
    branch: 'fix/webhook-idempotency',
    commitGuard: 'ENFORCED',
    evidenceCount: 3,
    modelEscalated: true
  },
  {
    id: 'task-103',
    slug: 'oauth-jwt-rotation-migration',
    title: 'Orchestrate asymmetric RS256 token rotation with JWKS endpoint and zero downtime',
    request: '/forge Migrate legacy HS256 auth to RS256 with key rotation support',
    status: 'RUNNING',
    size: 'L',
    phase: 6,
    phaseName: 'Implement',
    specialists: ['forge-architect', 'forge-security-engineer', 'forge-backend-engineer', 'forge-test-automation-engineer'],
    startedAt: '6 minutes ago',
    filesChanged: 7,
    gatesPassed: 8,
    totalGates: 15,
    summary: 'Currently in parallel implementation wave across disjoint files. Security threat model drafted, JWKS rotation endpoint written, now generating unit test vectors.',
    branch: 'security/jwt-rotation',
    commitGuard: 'ENFORCED',
    evidenceCount: 2,
    modelEscalated: true
  },
  {
    id: 'task-104',
    slug: 'query-plan-index-tuning',
    title: 'Optimize slow user profile queries by adding composite covering indexes',
    request: '/forge Profile database bottleneck on user activity dashboard query',
    status: 'VERIFIED',
    size: 'S',
    phase: 10,
    phaseName: 'Report',
    specialists: ['forge-performance-engineer', 'forge-database-engineer'],
    startedAt: '3 hours ago',
    completedAt: '2 hours ago',
    filesChanged: 2,
    gatesPassed: 15,
    totalGates: 15,
    summary: 'Analyzed EXPLAIN ANALYZE traces. Eliminated Seq Scan on 450k rows by adding index (user_id, created_at DESC). Query execution dropped from 380ms to 4.2ms (98.9% faster).',
    branch: 'perf/profile-index',
    commitGuard: 'ENFORCED',
    evidenceCount: 2,
    modelEscalated: false
  }
];

export const SAMPLE_EXECUTION_EVENTS: ExecutionEvent[] = [
  { id: 'ev-1', timestamp: '11:02:14', phase: 1, type: 'lifecycle', title: 'Task Understood & Classified', detail: 'Classified as Size M (Feature). Risk assessment: Low security, High UX sensitivity.', badge: 'Size M' },
  { id: 'ev-2', timestamp: '11:02:16', phase: 2, type: 'tool', title: 'Stack Detector Execution', detail: 'Executed detect-stack.mjs. Found Node.js 24 + TypeScript 5.7 + React 19 + Vitest + Playwright.', badge: '116 signatures' },
  { id: 'ev-3', timestamp: '11:02:22', phase: 3, type: 'lifecycle', title: 'Specification Grounded', detail: 'Created .forge/tasks/live-notification-center/spec.md with 6 testable acceptance criteria.', badge: 'spec.md' },
  { id: 'ev-4', timestamp: '11:02:29', phase: 4, type: 'agent', agent: 'forge-architect', title: 'Team Routed & Contract Frozen', detail: 'Assembled wave: forge-frontend-engineer + forge-backend-engineer + forge-browser-qa + forge-code-reviewer.', badge: '4 Specialists' },
  { id: 'ev-5', timestamp: '11:02:40', phase: 5, type: 'lifecycle', title: 'Disjoint File Ownership Plan', detail: 'plan.md assigned NotificationBell.tsx to Frontend, api/notifications/route.ts to Backend. No overlaps.', badge: 'Disjoint' },
  { id: 'ev-6', timestamp: '11:03:15', phase: 6, type: 'agent', agent: 'forge-backend-engineer', title: 'Backend Implementation Complete', detail: 'Implemented SSE endpoint with authentication session verification and pagination.', badge: '+84 -0 lines' },
  { id: 'ev-7', timestamp: '11:03:48', phase: 6, type: 'agent', agent: 'forge-frontend-engineer', title: 'Frontend UI Implementation Complete', detail: 'Implemented reactive bell icon with animated badge pulse and accessible aria-live counter.', badge: '+142 -12 lines' },
  { id: 'ev-8', timestamp: '11:04:12', phase: 7, type: 'gate', title: 'Pre-Browser Gate OPEN', detail: 'G1 Syntax (0 errors), G2 Types (0 errors), G3 Lint (clean), G4 Unit Tests (42 passed). Gate exit: 0.', badge: 'Gate OPEN', status: 'success' },
  { id: 'ev-9', timestamp: '11:04:45', phase: 7, type: 'agent', agent: 'forge-browser-qa', title: 'Playwright Journey QA Verified', detail: 'Simulated bell click, unread item dismiss, mark-all-read. Captured 3 high-res screenshots.', badge: '3 Journeys', status: 'success' },
  { id: 'ev-10', timestamp: '11:04:58', phase: 7, type: 'tool', title: 'Chrome DevTools MCP Inspection', detail: 'Verified 0 console exceptions, 0 failed network requests, 60fps dropdown open animation.', badge: 'DevTools MCP', status: 'success' },
  { id: 'ev-11', timestamp: '11:05:30', phase: 9, type: 'agent', agent: 'forge-code-reviewer', title: 'Independent Code Review Verdict: APPROVED', detail: 'Verified uncommitted diff against spec. Zero security regressions, clean TypeScript types.', badge: 'Approved', status: 'success' },
  { id: 'ev-12', timestamp: '11:05:42', phase: 10, type: 'lifecycle', title: 'Final Report Generated & Saved', detail: 'Saved to .forge/tasks/live-notification-center/report.md. Git guard verified: 0 commits created.', badge: 'VERIFIED', status: 'success' },
];

export const SAMPLE_FILE_CHANGES: FileChange[] = [
  { path: 'src/components/NotificationBell.tsx', status: 'added', linesAdded: 118, linesRemoved: 0, owner: 'forge-frontend-engineer', disjointChecked: true },
  { path: 'src/components/NotificationDropdown.tsx', status: 'added', linesAdded: 84, linesRemoved: 0, owner: 'forge-frontend-engineer', disjointChecked: true },
  { path: 'src/api/notifications/route.ts', status: 'added', linesAdded: 92, linesRemoved: 0, owner: 'forge-backend-engineer', disjointChecked: true },
  { path: 'tests/unit/notifications.test.ts', status: 'added', linesAdded: 64, linesRemoved: 0, owner: 'forge-test-automation-engineer', disjointChecked: true },
  { path: 'src/context/NotificationContext.tsx', status: 'modified', linesAdded: 45, linesRemoved: 8, owner: 'forge-frontend-engineer', disjointChecked: true }
];

export const SAMPLE_REVIEW_SECTIONS: ReviewSection[] = [
  { number: 1, title: 'Status & Overall Assessment', content: 'Status: VERIFIED. All 6 acceptance criteria specified in spec.md have been completely implemented and validated with automated regression tests and real browser automation.', verdict: 'APPROVE' },
  { number: 2, title: 'Architectural Approach', content: 'Clean separation between presentation (NotificationBell) and server-sent event push state. Respects disjoint file ownership; no conflicts detected.' },
  { number: 3, title: 'Code Quality & Conventions', content: 'Adheres to existing project patterns. Uses strict TypeScript types, explicit return signatures, and zero any assertions.' },
  { number: 4, title: 'Security & Auth Analysis', content: 'SSE subscription requires authenticated session bearer token. Input sanitized against XSS when rendering message bodies. No secret leakage.', verdict: 'APPROVE' },
  { number: 5, title: 'Performance & Resource Usage', content: 'Dropdown renders with virtualized list capping max DOM nodes at 10 items. CSS transitions utilize GPU-accelerated transform and opacity properties.' },
  { number: 6, title: 'Accessibility (WCAG 2.2 AA)', content: 'Badge announcement leverages aria-live="polite". Dropdown supports Esc key to dismiss, Tab trapping, and visible focus rings.', verdict: 'APPROVE' },
  { number: 7, title: 'Automated Test Coverage', content: 'Added 4 unit test suites covering empty state, message arrival, dismissal, and network reconnect backoff logic.' },
  { number: 8, title: 'Browser Verification (Playwright + DevTools)', content: '3 user journeys simulated in headless Chromium. Console log inspection via DevTools MCP confirmed zero JavaScript errors or 4xx/5xx network failures.', verdict: 'APPROVE' },
  { number: 9, title: 'Edge Cases & Error Handling', content: 'Network loss automatically transitions badge into offline indicator and resumes SSE connection with exponential backoff.' },
  { number: 10, title: 'Operations & SRE Readiness', content: 'Emits structured JSON logs on connection errors. Dev server shutdown cleanly released port 3000.' },
  { number: 11, title: 'Documentation & Knowledge Updates', content: 'API contracts documented; .forge/knowledge.md updated with SSE stream connection guidelines.' },
  { number: 12, title: 'Actionable Follow-up Tickets', content: 'None blocking. Suggested ticket FORGE-108 for optional browser native PushNotification API integration.' },
  { number: 13, title: 'Final Verdict & Summary', content: 'APPROVED FOR HUMAN REVIEW. All changes remain uncommitted in the local working tree. No git commits or pull requests were created.', verdict: 'APPROVE' }
];
