# Data Change Resilience Review

This report flags areas where API data changes (new chains, schema tweaks, list growth, etc.) could break accuracy or silently skew results. It summarizes current strengths and specific risks with concrete file references and recommendations.

## Overall Data Flow

- Sources: `cmc`, `messari`, `defillama`, `coingecko` via fetchers in `services/fetchers/*`.
- Standardization: Each fetcher maps to a shared shape (marketData, supplyData, platforms, metadata).
- Aggregation: `services/StablecoinDataService.js` merges per-symbol using source priority and optional union of network breakdowns; then transformer/formatters build view models.

## Platform/Chain Handling

### Strengths
- New chains from DeFiLlama auto‑appear; unknown names fall back to title‑case (no crash):
  - `services/fetchers/DeFiLlamaDataFetcher.js::_normalizeChainName`
  - `services/formatters/PlatformNormalizer.js::normalizePlatformName`
  - `services/StablecoinDataService.js::_normalizeChainName`
- Messari transform probes multiple keys for network breakdown: `networkBreakdown | network_breakdown | breakdown | networks | chains | platforms` (resilient to small schema shifts).

### Risks
- Platform totals are overstated by design: `HybridTransformer.calculatePlatformData` adds a coin’s full market cap to each platform it’s on. As coins add chains (e.g., USDT/USDC), “Dollars on Chain (USD)” and platform percentages in `views/chains.ejs` inflate substantially.
  - Root cause: No per‑chain market cap allocation (should apportion by chain supply share when available).
- Coin→platform links use raw names: `views/coins.ejs` links to `/platforms/<%= coin.platforms[i].name %>`, which breaks for names with spaces/special chars. Elsewhere, platform list correctly uses `p.uri`.
- If only CMC reports a new chain (CMC single `platform` object), the app misses additional chains until Messari/DeFiLlama expose them. Current logic prefers DeFiLlama for breakdown; otherwise falls back to a union, which is reasonable but not exhaustive.

## Merging/Deduplication

- Merge key is `(symbol || slug || name).toUpperCase()` in `StablecoinDataService.refreshData`. Different assets sharing a symbol can be merged incorrectly (symbol collisions are common). Consider composite keys (symbol + issuer/contract) and/or authoritative slug mapping.
- Some transforms synthesize values (e.g., Messari price hardcoded to 1.0). If sources begin returning real prices, priority logic still favors higher‑priority sources, but “1.0” can mask issues.

## Filtering/Scope Drift

- CMC (`services/fetchers/CMCDataFetcher.js`): Filters by tag `stablecoin` and price 0.50–2.00. Sensible for USD pegs, but excludes non‑USD pegs or volatile/algorithmic stables (by design?).
- DeFiLlama: Strong peg‑type filter via `allowedPegTypes` in `config/ApiConfig.js` (default is a static CSV string of fiat peg types). If DeFiLlama adds new peg types (e.g., `peggedAED`), they’re excluded until env updated. Also requires `coin.circulating` presence; a schema shift dropping/renaming it will filter assets out.
- Messari: Stablecoin detection uses tags and regexes; robust to missing fields but heuristic by nature (can under/over‑include depending on tagging).

## Schema/Field Assumptions

### Resilient
- Messari network breakdown is probed across multiple keys; extensive optional chaining avoids crashes.

### Fragile
- DeFiLlama assumes:
  - top‑level `peggedAssets`
  - `chainCirculating.{chain}.current.{peggedUSD|peggedEUR|...}`
  - `price`
  If renamed/removed, the fetcher throws (“No peggedAssets...”). Add tolerant fallbacks and health alerts for schema changes.
- CoinGecko fetcher only pulls `page=1` of 250; no pagination loop. If >250 stablecoins, the rest are ignored (minor as CG is a fallback).
- CMC listings limited by `limit` (default 5000); no pagination beyond that (probably fine for stablecoins).

## Pagination, Rate Limits, Retries

- CMC/Messari: Timeouts and retries via config; DeFiLlama returns full set (no pagination). Health monitor + circuit breaker are solid.
- CoinGecko: Appropriate headers with Pro key; but add pagination to be comprehensive.

## Numerical Precision and Units

- Uses JS numbers; OK for current magnitudes. Market cap computed as `circulating * price` in places—assumes USD denominated price (generally fine for USD pegs). Non‑USD pegs could distort unless handled via peg‑type.
- “Dollars on Chain” is not derived from per‑chain USD allocations; see overcounting risk above.

## Views and UX Coupling

- Slug mismatch for platform links in coin view; should use `uri` consistently.
- Templates use safe getters; missing fields display “No data” rather than erroring.

## Image/ID Handling

- `SourceDataPopulator.getCoinImageUrl`: prefers Messari logo; falls back to CMC image only if id is numeric. If image fields change/move, more default logos appear but won’t crash.

## Key File References

- Platform normalization/extraction: `services/formatters/PlatformNormalizer.js`
- Aggregation/merging + DeFiLlama‑first breakdown: `services/StablecoinDataService.js`
- Fetchers:
  - CMC: `services/fetchers/CMCDataFetcher.js`
  - Messari: `services/fetchers/MessariDataFetcher.js`
  - DeFiLlama: `services/fetchers/DeFiLlamaDataFetcher.js`
  - CoinGecko: `services/fetchers/CoinGeckoDataFetcher.js`
- Views: `views/chains.ejs`, `views/coins.ejs`, `views/home.ejs`
- Template helpers: `app/util/templateHelpers.js`

## High‑Impact Fixes to Consider

1) Correct platform totals
   - Allocate each coin’s market cap across platforms by DeFiLlama chain percentage when available; otherwise avoid adding a coin’s full mcap to multiple platforms.
   - Update `HybridTransformer.calculatePlatformData` to use `supplyData.networkBreakdown` or `defillamaData.rawChainCirculating` for proportional allocation.

2) Fix coin→platform link slugs
   - In `views/coins.ejs`, use a slug (`uri`) rather than raw platform name to form the URL.

3) Improve merge keys
   - Move from symbol‑only key to a composite (e.g., symbol + canonical id/slug or contract set) and add source‑aware disambiguation to avoid cross‑issuer collisions.

4) Make DeFiLlama peg‑type filtering adaptive
   - Default to including any `pegged*` fiat types while continuing to exclude `VAR`/algorithmic categories unless explicitly allowed via env.

5) Add pagination where missing
   - CoinGecko: iterate pages until empty to avoid truncation if stablecoins >250.
   - CMC: keep as is unless stablecoins approach `limit`.

6) Tolerant schema handling for DeFiLlama
   - Guard for renamed keys (e.g., fallback lists, feature flags), record health alerts, and continue in degraded mode instead of throwing.

If you want, I can implement (1) and (2) first, then tackle merge‑key robustness and CG pagination next.

