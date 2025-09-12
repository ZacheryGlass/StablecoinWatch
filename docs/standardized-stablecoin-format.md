# Standardized Stablecoin Format

This document defines the common shape returned by each data fetcher’s `transformToStandardFormat(rawData)` method, along with source-specific notes. The standardized format enables StablecoinWatch to merge and reconcile data from multiple APIs consistently.

## Object Shape

Every transformer returns an array of `StandardizedStablecoin` objects with the following fields:

- sourceId: string — Source identifier (e.g., `cmc`, `messari`, `defillama`, `coingecko`).
- id: string|number — Source-native identifier for the asset.
- name: string — Stablecoin name (e.g., `Tether`).
- symbol: string — Uppercase symbol (e.g., `USDT`).
- slug: string — Lowercase URL-safe identifier (best-effort when not provided by source).
- marketData: object
  - price: number|null — Current USD price.
  - marketCap: number|null — Market capitalization in USD.
  - volume24h: number|null — 24h trading volume in USD.
  - percentChange24h: number|null — 24h price change in percent.
  - rank: number|null — Market-cap rank.
- supplyData: object
  - circulating: number|null — Circulating supply.
  - total: number|null — Total supply.
  - max: number|null — Max supply.
  - networkBreakdown: Array<NetworkBreakdownEntry> — Cross-chain supply/platform entries (optional when not provided by source).
- platforms: Array<PlatformInfo> — High-level platform entries (derived or provided by source).
- metadata: object
  - tags: string[] — Classification tags.
  - description: string|null — Description text when provided.
  - website: string|null — Official website when provided.
  - logoUrl: string|null — Logo URL when provided/derivable.
  - dateAdded: string|null — When the asset was added (source-native format).
  - ...source-specific fields may be present for debugging or future features.
- confidence: number — Heuristic confidence score (0–1) assigned by the fetcher.
- timestamp: number — Unix ms when the record was transformed.

Where applicable, `platforms` are kept in sync with `supplyData.networkBreakdown`. The aggregator merges per-network entries across sources and normalizes their names in the view layer.

### NetworkBreakdownEntry

- name: string — Platform name (e.g., `Ethereum`).
- network: string — Lowercased network identifier/slug (e.g., `ethereum`, `eth`).
- contractAddress: string|null — Token contract address on this network.
- supply: number|null — Supply on this network.
- percentage: number|null — Share of total supply.

## Source Transformers

### CoinMarketCap (services/fetchers/CMCDataFetcher.js)

- symbol: Uppercased (standardized).
- slug: Uses CMC `slug` when available, else lowercased `symbol`.
- marketData: Fills price, marketCap, volume24h, percentChange24h, rank from `quote.USD`.
- supplyData:
  - circulating derived from `market_cap / price` when both present; else falls back to `circulating_supply`.
  - networkBreakdown/platforms derived from `platform` when present (single network with token address).
- metadata: tags from CMC, logo from `s2.coinmarketcap.com` using the CMC `id`, `dateAdded` from CMC when present.
- confidence: 0.9.

### Messari (services/fetchers/MessariDataFetcher.js)

- symbol: Uppercased (standardized).
- slug: Lowercased from `slug` or `symbol`.
- marketData: price defaults to `1.0` for stablecoins; marketCap is `circulating * 1.0` when circulating supply exists. Volume/rank/change are not provided by the stablecoin metrics endpoint.
- supplyData: uses Messari supply fields and builds a comprehensive `networkBreakdown` from any of: `networkBreakdown`, `network_breakdown`, `breakdown`, `networks`, `chains`, or `platforms` shapes.
- platforms: mirrored from breakdown to assist merging, when present.
- metadata: uses Messari profile for description, website, and logo when available; preserves tags.
- confidence: 0.85.

Notes: The `1.0` default price is a pragmatic fallback when Messari does not provide market pricing in this endpoint. Higher-priority sources (e.g., CMC) will override price/market cap during merge when available.

### DeFiLlama (services/fetchers/DeFiLlamaDataFetcher.js)

- symbol: Uppercased (standardized in transformer).
- slug: Lowercased and sanitized from `symbol` or `name`.
- marketData: price is provided when the request includes `includePrices=true` (as configured). Volume/rank/change are not present in this endpoint.
- supplyData:
  - circulating extracted from `circulating.peggedUSD` (or other pegs as fallback).
  - networkBreakdown constructed from `chainCirculating` with per-chain supply and percentage.
- platforms: derived from `chains` list when available.
- metadata: tags include `stablecoin`; defillama-specific raw fields are nested under `metadata.defillamaData` for future use.
- confidence: 0.8 (high for supply/platform coverage).

### CoinGecko (services/fetchers/CoinGeckoDataFetcher.js)

- Currently a stub (not active); returns an empty array. When implemented, it must conform to the same standardized shape.

## Consistency Rules

- symbol: uppercased in all transformers.
- slug: lowercased; sanitize when source does not provide a native slug.
- platforms and networkBreakdown entries: include fields `name`, `network`, `contractAddress`, `supply`, `percentage` (null when not available).
- confidence and timestamp must be set by each transformer.

## Merge Behavior Notes

The aggregator prioritizes sources using `getCapabilities().priority` (higher wins) per field group, with consensus checks. For example, CMC generally provides price/market cap, Messari provides supply/network breakdown, and DeFiLlama supplements cross-chain supply. When only Messari is active, the default price of `1.0` ensures stablecoins still render with approximate market caps.

If you add a new data source, implement `transformToStandardFormat(rawData)` to match the shape above and set a sensible `confidence` value. Include a `networkBreakdown` when possible, and mirror essential network info into `platforms` to improve cross-source merging.
