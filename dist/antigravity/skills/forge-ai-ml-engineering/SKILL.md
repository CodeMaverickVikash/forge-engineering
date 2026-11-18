---
name: forge-ai-ml-engineering
description: LLM and ML features (prompts, structured output, RAG, agents, evals, injection safety, cost).
disable-slash-command: true
---


# AI / ML Engineering

LLM features are probabilistic software. Treat prompts as code, outputs as untrusted input, and quality as something you measure with evals, not something you eyeball once. Discover the provider SDK, framework (LangChain, LlamaIndex, Vercel AI SDK, raw HTTP), vector store and model configuration already in use from `.forge/context.json` before writing anything.

## Ground rules

- **Use what the project already uses.** Same provider SDK, same wrapper, same config pattern. Do not add a second provider or framework without authorization.
- **Model IDs change.** Never pick a model ID from memory. Read the model names already configured in the project, and check the provider's current documentation (models, pricing, limits, deprecations) at implementation time. Keep model IDs in config, not scattered literals.
- **Never hardcode API keys.** Read them from env or the secrets manager; add only the variable **name** to `.env.example`. Never log keys or full prompts containing user secrets.
- **Paid calls cost money.** Tests and evals in CI use mocks, recorded responses or a small local or test budget. Running large evals against a paid API needs user authorization.
- Select the model by task: the smallest model that meets the quality bar on your eval set, then check latency and cost. Use larger models only where evals show they are needed.

## LLM integration checklist

- [ ] Timeouts, bounded retries with backoff and jitter on rate limits (429) and overload or 5xx errors; respect `Retry-After`.
- [ ] Explicit `max_tokens` (or equivalent) and handling of truncated outputs (check the stop or finish reason).
- [ ] Streaming for user-facing generation where the UI supports it; handle mid-stream errors and client disconnects.
- [ ] Token budgeting: count or estimate input size; truncate or summarize context deterministically.
- [ ] Log model, prompt version, token usage, latency and request ID; redact PII and secrets.
- [ ] Graceful degradation when the provider is down (fallback message, queue, or alternate model if configured).

## Prompt design and versioning

- Keep prompts in versioned files or constants near the feature, not built ad hoc across the codebase. Change prompts like code: reviewed, tested against the eval set.
- Structure: role and task, constraints, context (clearly delimited, e.g. tagged sections), output format, and a few representative examples when they measurably help.
- Separate trusted instructions (system or developer prompt) from untrusted content (user input, retrieved documents, tool results). Delimit and label untrusted content.
- Ask for exactly the output you will parse. Avoid instructions the code does not need.

## Structured outputs and tool use

- Prefer the provider's native structured output or tool-calling features over parsing free text. Define schemas (JSON Schema, Pydantic, zod) once and validate every response; on validation failure, retry once with the error or fail cleanly.
- Tools: narrow, well-described, with typed parameters. Validate tool arguments server-side as untrusted input. Tool execution enforces the **end user's** permissions, never the service's superuser rights.
- Side-effecting tools (send, pay, delete, write) require explicit confirmation or policy checks and are idempotent.

## RAG (retrieval-augmented generation)

1. **Ingestion**: clean and normalize text; chunk by structure (headings, paragraphs, code blocks) with size and overlap tuned on evals; store source, section, timestamp and access-control metadata with each chunk.
2. **Embeddings**: one embedding model per index (re-embed everything when changing it); record the model name and dimension with the index.
3. **Retrieval**: filter by tenant and permissions **before** ranking; combine vector and keyword (hybrid) search when exact terms matter; rerank if configured; cap the number of chunks to fit the token budget.
4. **Generation**: instruct the model to answer from the provided context, cite sources by ID, and say when the answer is not in the context.
5. **Evaluate retrieval separately** from generation: recall@k / hit rate on a labeled query set, then answer faithfulness and citation correctness.
- Keep the index in sync with source updates and deletions (including deletion for privacy requests).

## Agent architectures

- Prefer a fixed workflow (chain of steps) over an autonomous agent when the steps are known.
- Bounded loops: max iterations, max tokens or cost, wall-clock timeout, and a clear stop condition.
- Least-privilege tool sets per agent; allowlists for hosts, paths and commands; human approval for irreversible actions.
- Persist state and traces of each step (inputs, tool calls, outputs) for debugging and evals.

## Evaluation

- Build a **golden set**: representative inputs, edge cases and known-hard or adversarial cases, with expected outputs or grading criteria. Store it in the repo.
- Grade with deterministic checks first (schema valid, contains required fields, exact match), then rubric or model-graded scoring where needed, spot-checked by humans.
- Run evals on every prompt, model or retrieval change as a **regression gate**; compare against the baseline and report the deltas.
- Unit tests mock the provider and test the surrounding code: parsing, validation, tool dispatch, error handling, retries.

## Safety

- **Prompt injection**: retrieved documents, web pages, emails, file contents and tool outputs may contain instructions. Never let them change permissions, tool access or system behavior. Gate sensitive actions outside the model.
- **Output handling**: treat model output as untrusted. Escape before rendering as HTML, never execute generated code or SQL without sandboxing and validation, validate URLs before fetching.
- **Data leakage**: no secrets or other users' data in prompts; enforce tenant isolation in retrieval; check the provider's data retention terms against the project's policy.
- **PII**: minimize and redact before sending where possible; do not persist raw prompts with PII longer than necessary.
- Add moderation or content filtering where the product requires it.

## Cost, latency and inference optimization

- Measure tokens and latency per request before optimizing.
- Use prompt caching for long stable prefixes where the provider supports it; cache deterministic results by input hash with a TTL.
- Batch offline workloads with the provider's batch API where available; parallelize independent calls within rate limits.
- Shrink context: retrieve less, summarize history, trim tool output.
- Self-hosted inference: quantization, batching and appropriate hardware choice; measure quality impact on the eval set.

## ML pipelines (basics)

- Reproducibility: pinned dependencies, fixed seeds, versioned data and model artifacts, recorded hyperparameters.
- Strict train / validation / test splits with no leakage (time-based splits for temporal data).
- Same preprocessing code for training and serving. Monitor input drift and prediction quality after deploy.
- Use the project's existing tooling (notebooks, scripts, experiment tracker); do not introduce new platforms.

## Output

Report: provider and model configuration used (from project config, with docs checked), prompts added or changed with versions, schemas, tools and their permission model, eval set and results versus baseline, cost and latency measurements, safety controls (injection, PII, output handling), new env variable names, and the tests and commands run.
