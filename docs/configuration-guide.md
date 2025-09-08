# Configuration Guide

This guide documents only the configuration settings that are active in the current StablecoinWatch app. Anything not listed here is not wired into runtime behavior yet.

Status: Active only (reflects current runtime).

## Quick Start

### Minimal Configuration

```bash
# .env
CMC_API_KEY=your_coinmarketcap_api_key
MESSARI_API_KEY=your_messari_api_key
# Optional: enable additional data sources
# COINGECKO_API_KEY=your_coingecko_api_key
# ENABLED_SOURCES=cmc,messari,defillama
# Optional: change server port
# PORT=3000
# Optional: set environment
# NODE_ENV=development
```

### Recommended Production Configuration

```bash
# .env
# Required API Keys
CMC_API_KEY=your_coinmarketcap_api_key
MESSARI_API_KEY=your_messari_api_key

# Optional API Keys
# COINGECKO_API_KEY=your_coingecko_api_key

# Data Sources
ENABLED_SOURCES=cmc,messari,defillama

# Server
PORT=3000
NODE_ENV=production

# Health Monitoring (active today)
HEALTH_MONITORING=true
HEALTH_CHECK_INTERVAL_MS=60000
ERROR_RATE_THRESHOLD=0.2
RESPONSE_TIME_THRESHOLD_MS=10000
DEGRADED_MODE_THRESHOLD=0.7
MIN_HEALTHY_SOURCES=1
HEALTH_RETENTION_DAYS=7

# Circuit Breaker (active today)
CIRCUIT_BREAKER=true
CIRCUIT_BREAKER_FAILURES=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000
CIRCUIT_BREAKER_RESET_MS=300000
```

Note: Data update cadence is controlled by `UPDATE_INTERVAL_MINUTES` (default: 15). You can also provide environment-specific overrides via `.env.<NODE_ENV>`.

## Active Settings

### Server
- `PORT` (default: 3000) � Web server port used by Express.
- `NODE_ENV` (default: development) � Environment label; used by configuration to adjust logging of warnings.

### API Keys (Required)
- `CMC_API_KEY` � CoinMarketCap API key. Enables CMC data fetching.
- `MESSARI_API_KEY` � Messari API key. Enables Messari data fetching.

### API Keys (Optional)
- `COINGECKO_API_KEY` � CoinGecko API key. Enables enhanced CoinGecko data fetching with higher rate limits.

### Data Sources
- `ENABLED_SOURCES` (default: cmc,messari) � Comma-separated list of enabled data sources. Available options: cmc, messari, coingecko, defillama.

### Health Monitoring
These values are consumed by the HealthMonitor service.
- `HEALTH_MONITORING` (default: true) � Enable health monitoring.
- `HEALTH_CHECK_INTERVAL_MS` (default: 60000) � Interval for health checks and cleanup.
- `ERROR_RATE_THRESHOLD` (default: 0.2) � Error rate threshold for alerts/degraded state.
- `RESPONSE_TIME_THRESHOLD_MS` (default: 10000) � Response time alert threshold.
- `DEGRADED_MODE_THRESHOLD` (default: 0.7) � Health score threshold for degraded mode.
- `MIN_HEALTHY_SOURCES` (default: 1) � Minimum healthy data sources to consider system operational.
- `HEALTH_RETENTION_DAYS` (default: 7) � How long to retain health data in memory windows.

### Circuit Breaker
Applied to external API calls via the HealthMonitor.
- `CIRCUIT_BREAKER` (default: true) � Enable circuit breaker behavior.
- `CIRCUIT_BREAKER_FAILURES` (default: 5) � Consecutive failures before opening the circuit.
- `CIRCUIT_BREAKER_TIMEOUT_MS` (default: 60000) � Open state timeout before half-open.
- `CIRCUIT_BREAKER_RESET_MS` (default: 300000) � Reset timeout used when transitioning states.

## Troubleshooting

- Missing data from one source:
  - Ensure the corresponding API key is set and valid for enabled sources.
  - Check `ENABLED_SOURCES` configuration to verify the source is enabled.
  - Check for circuit breaker open state by observing logs; increase timeouts only if necessary.
  - For DeFiLlama, no API key is required but ensure network access to their endpoints.
- Health monitoring seems too sensitive:
  - Tune `ERROR_RATE_THRESHOLD` or `RESPONSE_TIME_THRESHOLD_MS`.
  - Ensure `MIN_HEALTHY_SOURCES` fits your enabled keys (one or both).
- App not starting on expected port:
  - Set `PORT` explicitly and ensure it�s not in use by another process.

## Notes

- Only the settings listed above are currently used by the running application.
- Multi-source configuration is active via `ENABLED_SOURCES`.
- DeFiLlama integration is operational and requires no API key.


### Data Processing (Active)
- MATCH_THRESHOLD (default: 0.8)
- MIN_STABLECOIN_PRICE (default: 0.5)
- MAX_STABLECOIN_PRICE (default: 2.0)

### API Defaults (Active)
- API_DEFAULT_TIMEOUT_MS - Default timeout for API calls
