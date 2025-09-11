# StablecoinWatch – Application Overview and Architecture

This document provides a comprehensive tour of the StablecoinWatch codebase: architecture, data flow, configuration, services, routes, UI, and per-file responsibilities. Use it as a starting point for development and debugging.

## High-Level Architecture

- Runtime: Node.js + Express server rendering EJS templates
- Data pipeline: Multiple upstream sources (CoinMarketCap, Messari, DeFiLlama, CoinGecko) → standardized fetchers → aggregation/merge → view transformation → rendered pages
- Health + scheduling: Health monitoring (circuit breaker, metrics) and cron-based periodic refreshes
- Configuration: Centralized in `config/` with environment overrides
- Logging: Minimal global logger with single verbose toggle; legacy util formatter still present (see Logging section)

## Data Flow

1. App start (`app/app.js`)
   - Loads environment and initializes logger
   - Builds service container (HealthMonitor, StablecoinDataService)
   - Attaches services to Express app and routes
   - Triggers initial data refresh and schedules periodic updates

2. Data fetching (`services/fetchers/*`)
   - Fetchers pull raw data from upstream APIs (CMC, Messari, DeFiLlama, CoinGecko stub)
   - Each fetcher transforms raw data to a standard shape: `{ id, name, symbol, slug, marketData, supplyData, platforms, metadata }`
   - HealthMonitor records success/failure with timings and counts

3. Aggregation/merge (`services/StablecoinDataService.js`)
   - Merges per-symbol across sources using a source-priority policy
   - Computes consensus and confidence metrics; builds a hybrid-compatible object
   - Uses `HybridTransformer` to produce view models and platform summaries

4. View transformation (`services/HybridTransformer.js`)
   - Creates `Stablecoin` view models with formatted values
   - Normalizes platform names and produces aggregated platform data

5. Rendering (`routes/routes.js` + `views/*.ejs`)
   - Routes read the view model from the data service and render EJS templates
    - Formatting helpers provided by `app/util.js`

### End-to-End Request-to-Render Walkthrough

- Trigger
  - Initial refresh at boot and every `UPDATE_INTERVAL_MINUTES` (cron). Users hitting the site always consume the latest successfully built view model.
- Fetch
  - Active fetchers (per `ApiConfig.getEnabledSources()` and `isConfigured()`) consult HealthMonitor’s circuit breaker; if open, they skip the call until retry time.
  - Each fetcher requests upstream (or mock), filters stablecoins, and returns raw arrays.
- Standardize
  - Each fetcher maps raw arrays to `StandardizedStablecoin` objects (see `docs/standardized-stablecoin-format.md`).
- Aggregate & Merge
  - Group by symbol (case-insensitive). For each field, pick the value from the highest‑priority source that has data (CMC > Messari > DeFiLlama by default).
  - Build a union of network/platform entries keyed by `network:contract` to avoid duplicates across sources.
  - Compute consensus (deviation from median) for numerical fields and derive confidence scores across market/supply/platform.
  - Compute quality flags (missing critical fields).
- Transform for UI
  - Convert aggregated records to “hybrid-like” objects for compatibility with the existing view transformer.
  - `HybridTransformer` produces `Stablecoin` models with formatted fields and calculates platform aggregates (`platform_data`).
- Persist view model
  - `StablecoinDataService` stores `{ stablecoins, metrics, platform_data }` for routes to render.
- Render
  - Routes read the view model and render EJS templates. `/api/health` exposes system health JSON.

### Merging, Consensus, and Confidence

- Source priority by capability (from `ApiConfig`), with optional env override via `SOURCE_PRIORITY`: higher priority wins per field group, e.g., CMC for market data, Messari/DeFiLlama for supply/network.
- Consensus score: measures spread around the median of available numeric values (e.g., price). Lower spread ⇒ higher consensus.
- Confidence scores: weighted by source coverage and consensus; overall is combined from market, supply, and platform facets.
- Quality flags: identify missing critical fields (e.g., price/marketCap/circulating) for debugging and UI hints.

### Health Monitoring & Circuit Breaker (Runtime Behavior)

- Per‑source metrics recorded on each operation (`recordSuccess`/`recordFailure`): response times, counts, error types, consecutive failures.
- Alerts (deduped by source+type):
  - High Error Rate (errorRate > `ERROR_RATE_THRESHOLD`, default 0.3)
  - Consecutive Failures (≥ 3 consecutive)
  - Circuit Breaker Open (after failures exceed threshold; default 6)
- Circuit breaker: closed → open (block) → half‑open (probe) → closed (recover). Fetchers skip calls while open until `nextRetryTime`.
- System status aggregates per-source health to `healthy|degraded|critical|down`, printed every 5 minutes with active alerts.

### Route-to-Template Mapping

- `/` → `views/home.ejs`: list of stablecoins (`data.stablecoins`) and topline metrics (`data.metrics`).
- `/coins/:symbol` → `views/coins.ejs`: detail for a single coin, using `uri` or `symbol`.
- `/platforms` → `views/chains.ejs`: platform aggregates (`platform_data`).
- `/platforms/:name` → `views/platforms.ejs`: detail for a single platform (slug or name matching).
- `/status` → `views/status.ejs`: system health, metrics, and warnings from `HealthMonitor`.
- `/api/health` → JSON health, including sources and alerts.

## Configuration

- `config/AppConfig.js`
  - Global app configuration (port, update cadence, health thresholds, caching)
  - Development toggles (`DEBUG_MODE`, `VERBOSE`, `VERBOSE_LOGGING`, `LOG_LEVEL`)

- `config/ApiConfig.js`
  - Per-source API settings: endpoints, rate limits, stablecoin filters, mock data
  - Notable defaults:
    - CMC: filter by tag `stablecoin`, price range 0.50–2.00
    - DeFiLlama: allowed peg types default to common fiat (USD, EUR, GBP, …) excluding VAR
    - Messari & CoinGecko: enabled when ENV keys present

## Logging

- `app/logger.js` (new)
  - Single toggle for verbose logs: set `VERBOSE_LOGGING=true` or `LOG_LEVEL=debug`
  - Adds timestamps and level tags; `console.debug` is no-op unless enabled
  - Sets `global.DEBUG` to keep legacy debug checks consistent

- Legacy overrides in `app/util.js`
  - Replaces `console.info/warn/error/debug` with colored output and uses `global.DEBUG`
  - With the new logger, both operate; util’s formatting may supersede. See the logging expansion issue for unification plan.

## Services and Core Modules

- `app/app.js`
  - Loads env, initializes logger, sets up Express, static assets, DI container
  - Health middleware records request success/failure
  - Schedules data refresh via `node-cron` using `UPDATE_INTERVAL_MINUTES`

- `services/ServiceFactory.js`
  - Creates `StablecoinDataService` with a `DataFetcherRegistry` and `HealthMonitor`

- `services/DataFetcherRegistry.js`
  - Registers enabled fetchers per `ApiConfig.getEnabledSources()`
  - `getActive()` returns fetchers ready to run

- `services/StablecoinDataService.js`
  - Orchestrates data refresh:
    - Parallel fetch from active sources (with health checks)
    - Groups by symbol → merges fields using source priority
    - Computes consensus/confidence/quality
    - Converts to “hybrid-like” shape for `HybridTransformer`
  - Persists aggregated list, platform data, and metrics
  - Supplies legacy view model for routes via `getData()`

- `services/HybridTransformer.js`
  - Builds `Stablecoin` instances for UI
  - Normalizes platform names, extracts platforms from hybrid/network breakdown
  - Calculates platform aggregation (`calculatePlatformData`)
  - Simple numeric formatting helpers for display

- `services/HealthMonitor.js`
  - Tracks per-source metrics, errors, circuit breaker state
  - Provides `getSystemHealth()` and `getSourceHealth()` overviews
  - Periodic checks and cleanup

## Fetchers

- `services/fetchers/CmcDataFetcher.js`
  - Fetches `/v1/cryptocurrency/listings/latest` (or mock file)
  - Filters to tag `stablecoin` and budget price range; maps to standard format

- `services/fetchers/MessariDataFetcher.js`
  - Uses Messari SDK with Axios fallback (auth required)
  - Targets stablecoin-related endpoints; focuses on supply + network breakdown

- `services/fetchers/DeFiLlamaDataFetcher.js`
  - Calls `https://stablecoins.llama.fi/stablecoins?includePrices=true`
  - Logs unique peg types (debug) and filters by allowed `pegType`
  - Applies USD price sanity checks only to `peggedUSD`
  - Builds cross-chain network breakdown from `chainCirculating`

- `services/fetchers/CoinGeckoDataFetcher.js`
  - Stub scaffold; ready for future integration

## Interfaces and Models

- Interfaces: `interfaces/IDataFetcher.js`, `interfaces/IStablecoinDataService.js`, `interfaces/IHealthMonitor.js`
  - Define contracts and rich typedefs for code completion and docs

- Models: `models/stablecoin.js`, `models/platform.js`
  - UI-focused POJOs used by the HybridTransformer and templates

## Routes and Views

- `routes/routes.js`
  - `/` (home): stablecoin list + basic metrics
  - `/status`: app health and system metrics
  - `/platforms`: list of platforms; `/platforms/:name`: platform detail
  - `/coins/:symbol`: stablecoin details
  - `/donate`: donation page
  - All routes pull `dataService.getData()` and pass formatting helpers

- Views: `views/*.ejs`, partials under `views/partials/`
  - `home.ejs`: ranks by market cap, shows price, mcap, volume, platform
  - `coins.ejs`: coin detail view (hybrid fields rendered)
  - `chains.ejs`, `platforms.ejs`, `status.ejs`, `donate.ejs`

## Scripts and Static Assets

- `scripts/update-mock-data.js`
  - CLI utility to pull and persist mock snapshots from CMC, Messari, DeFiLlama
  - Useful for local development without live API keys

- Static assets
  - `res/css/common.css` – site styles
  - `res/img/*` – logos and QR images
  - `res/js/chart.min.js` – charting lib (not heavily used in current views)

## Existing Documentation

- `README.md` – primary project readme (run, environment, overview)
- `docs/` – integration and configuration guides
  - `docs/configuration-guide.md`, `docs/api-integration-guide.md`
  - DeFiLlama + Messari subfolders with endpoint references
  - `docs/standardized-stablecoin-format.md` – target data shape

## Per-File Responsibility Map

- app/
  - `app.js` – Express bootstrap, DI, health middleware, cron refresh
  - `logger.js` – global logger and verbose toggle
  - `util.js` – formatting helpers and legacy console overrides

- config/
  - `AppConfig.js` – global runtime config, env parsing, validation
  - `ApiConfig.js` – per-API settings, enabled sources, defaults

- services/
  - `ServiceFactory.js` – factories for services
  - `DataFetcherRegistry.js` – manages fetchers
  - `HealthMonitor.js` – health, circuit breaker, metrics
  - `StablecoinDataService.js` – aggregation/orchestration, metrics, view model
  - `HybridTransformer.js` – UI model transformation and platform aggregation
  - fetchers/
    - `CmcDataFetcher.js`, `MessariDataFetcher.js`, `DeFiLlamaDataFetcher.js`, `CoinGeckoDataFetcher.js`

- interfaces/
  - `IDataFetcher.js`, `IStablecoinDataService.js`, `IHealthMonitor.js`

- routes/
  - `routes.js` – all site routes and render wiring

- models/
  - `stablecoin.js`, `platform.js` – view models

- views/
  - `home.ejs`, `coins.ejs`, `chains.ejs`, `platforms.ejs`, `status.ejs`, `donate.ejs`, partials

- docs/
  - Configuration and API integration guides; platform references

- scripts/
  - `update-mock-data.js` – mock data workflow

## Operational Notes

- Data cadence: set via `UPDATE_INTERVAL_MINUTES` (default 15). Initial refresh runs at boot.
- Enabled sources: controlled by env (e.g., `CMC_API_KEY`, `MESSARI_API_KEY`). DeFiLlama is enabled by default.
- Mock data: set `*_MOCK_DATA=true` to load local JSON files (`cmc_raw_output.json`, etc.)
- Logging: set `VERBOSE_LOGGING=true` or `LOG_LEVEL=debug` to enable debug-level details

## Known Caveats / Improvement Ideas

- Console overrides in `util.js` and the new logger both decorate logs; unify under a single logger (see issue in `docs/issue-logging-expansion.md`).
- `HybridTransformer` focuses on display models; deeper platform/supply analytics can be extended.
- CoinGecko integration is a stub.
- Add tests for critical merging logic and transform correctness.

## Architecture Diagram

```mermaid
flowchart LR
  A[Startup + Cron] --> DS[StablecoinDataService]
  A --> HM[HealthMonitor]
  A --> REG[DataFetcherRegistry]
  A --> ROUTES[Express Routes]

  subgraph FETCHERS
    CMC[CmcDataFetcher]
    MESS[MessariDataFetcher]
    DEFI[DeFiLlamaDataFetcher]
    CGKO[CoinGeckoDataFetcher (stub)]
  end

  REG --> CMC
  REG --> MESS
  REG --> DEFI
  REG --> CGKO

  HM -. circuit breaker .-> CMC
  HM -. circuit breaker .-> MESS
  HM -. circuit breaker .-> DEFI

  CMC --> STD1[Standardized arrays]
  MESS --> STD2[Standardized arrays]
  DEFI --> STD3[Standardized arrays]
  CGKO --> STD4[Standardized arrays]

  STD1 --> DS
  STD2 --> DS
  STD3 --> DS
  STD4 --> DS

  DS --> AGG[Aggregated per symbol]
  AGG --> HT[HybridTransformer]
  HT --> VM[View model]
  DS --> VM

  ROUTES --> VM
  ROUTES --> VIEWS[EJS templates]
  VIEWS --> CLIENT[Browser]

  CLIENT --> ROUTES
  ROUTES -. record success/failure .-> HM

  ROUTES --> HEALTH[API: /api/health]
  HEALTH --> HM
  HM --> ROUTES
```
