---
title: Expand application-wide logging with structured, leveled, and contextual logs
labels: enhancement, logging, tech-debt
assignees: ''
---

Summary
- Expand the minimal logger into a structured, leveled logging system across the app. Provide consistent context (module, operation, request IDs), support per-module log levels, and add targeted debug traces for data fetch/transform/route flows.

Motivation
- Easier debugging in production-like environments, better visibility into data pipeline issues (e.g., asset classification), timing, and API health. Current minimal logger + legacy util console overrides are sufficient for dev, but lack structure and consistent context.

Scope
- Centralize logging API and eliminate duplicate console overrides.
- Instrument fetchers (CMC, Messari, DeFiLlama, CoinGecko), aggregation/transformers, routes, and schedulers.
- Add request correlation IDs in HTTP middleware.
- Support JSON log output option for ingestion by external tools.

Acceptance Criteria
- One logging entry point used app-wide (no direct console overrides in util.js by default).
- Configurable global level via `LOG_LEVEL` with module overrides (e.g., `LOG_LEVEL_FETCHERS`).
- Optional JSON logs via `LOG_FORMAT=json`.
- Each log includes: timestamp, level, module, message, and optional fields (reqId, sourceId, durationMs, counts).
- Health monitor logs summarize source status at configured intervals.
- Documentation added to `docs/logging.md` with usage patterns and env var matrix.

Proposed Implementation
1) Logger core
   - Create `lib/logger` with a small wrapper over console that supports: levels (debug/info/warn/error), child loggers (`logger.child({ module: 'routes' })`), and optional JSON formatting.
   - Read config from env: `LOG_LEVEL`, `LOG_FORMAT`, `VERBOSE_LOGGING`.
   - Remove legacy console overrides in `app/util.js` or guard them behind `USE_LEGACY_CONSOLE_FORMAT=true`.

2) Cross-cutting instrumentation
   - `app/app.js`: request-scoped logger with reqId (header `x-request-id` or generated UUID), attach to `req.log`.
   - `services/HealthMonitor.js`: summarize source health deltas and emit warnings when thresholds exceeded.
   - `services/StablecoinDataService.js`: log refresh lifecycle: start/end, per-source counts, merge stats, final totals.
   - `services/fetchers/*`: log request URL (without secrets), durations, record counts, peg types (defillama), filter rejections (sampled), and error categories.
   - `services/HybridTransformer.js`: log number of coins processed, top-N by market cap, and platform aggregation counts.
   - `routes/routes.js`: log route hits with reqId and render timings.
   - `scripts/update-mock-data.js`: verbose mode flag, per-source progress and output files.

3) Config and docs
   - Add env vars with sane defaults: `LOG_LEVEL`, `LOG_FORMAT`, `VERBOSE_LOGGING`, `USE_LEGACY_CONSOLE_FORMAT` (default false), and module-specific overrides.
   - Document examples and guidance in `docs/logging.md`.

4) Quality
   - Keep logs low-noise at `info`. Use `debug` for high-volume events (per-coin traces).
   - Redact secrets (API keys) and large payloads. Truncate long arrays/strings.
   - Unit tests (lightweight) for logger formatting and child logger inheritance.

Out of Scope
- External log shipping. We can add a follow-up for integrating with a log backend if needed.

Risks / Mitigations
- Noise: adopt sampling (e.g., log 1 of N coin-level events) and level-gating by module.
- Performance: lazy format complex objects only when level enabled.
- Compatibility: keep a fallback to legacy formatting behind a flag.

Tasks
- [ ] Implement `lib/logger` with levels, child, JSON mode.
- [ ] Add request ID middleware and `req.log`.
- [ ] Instrument fetchers with start/end + counts + peg types (debug).
- [ ] Instrument StablecoinDataService refresh and merge phases.
- [ ] Instrument HybridTransformer summary metrics.
- [ ] Update util.js to stop overriding console by default or guard behind flag.
- [ ] Add docs `docs/logging.md` and env var matrix.
- [ ] Add basic tests for logger behavior.

Additional Context
- Recent fix excluded non-USD pegs and added a minimal toggle. Expanding logging will make similar issues faster to spot in the future.

