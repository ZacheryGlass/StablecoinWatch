# Configuration Guide

StablecoinWatch v2 provides approximately 90 configuration options based on the actual implementation. This guide covers all currently supported settings.

## Quick Start

### Minimal Configuration

The absolute minimum to get started:

```bash
# .env
CMC_API_KEY=your_coinmarketcap_api_key
MESSARI_API_KEY=your_messari_api_key
```

### Recommended Production Configuration

```bash
# .env
# Required API Keys
CMC_API_KEY=your_coinmarketcap_api_key
MESSARI_API_KEY=your_messari_api_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Data Sources
ENABLED_SOURCES=cmc,messari
UPDATE_INTERVAL_MINUTES=15

# Health Monitoring
HEALTH_MONITORING=true
CIRCUIT_BREAKER=true

# Rate Limiting
CMC_RATE_LIMIT=333
MESSARI_RATE_LIMIT=20

# Memory Management
MEMORY_CLEANUP=true
MEMORY_CLEANUP_INTERVAL_MS=300000
```

## Configuration Categories

## 🔧 Core Application Settings

### Server Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `PORT` | `3000` | Web server port |
| `HOST` | `localhost` | Server bind address |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

## 🗝️ API Keys (Required)

### Required API Keys

| Setting | Description |
|---------|-------------|
| `CMC_API_KEY` | **Required** CoinMarketCap API key |
| `MESSARI_API_KEY` | **Required** Messari API key |

### Optional API Keys

| Setting | Description |
|---------|-------------|
| `COINGECKO_API_KEY` | Optional CoinGecko API key for Pro features |

## 🌐 Data Source Configuration

### Source Management

| Setting | Default | Description |
|---------|---------|-------------|
| `ENABLED_SOURCES` | `cmc,messari` | Comma-separated list of enabled sources |
| `SOURCE_PRIORITY` | See below | JSON object defining source priorities |

Default source priorities:
```json
{
  "cmc": 10,
  "messari": 8,
  "coingecko": 6,
  "defillama": 4
}
```

### Data Update Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `UPDATE_INTERVAL_MINUTES` | `15` | Data refresh frequency |
| `INITIAL_DELAY_MS` | `0` | Initial delay before first fetch |
| `RETRY_ATTEMPTS` | `3` | Number of retry attempts |
| `RETRY_DELAY_MS` | `1000` | Delay between retries |
| `REQUEST_TIMEOUT_MS` | `30000` | Request timeout |

### Data Processing

| Setting | Default | Description |
|---------|---------|-------------|
| `MATCH_THRESHOLD` | `0.8` | Coin name similarity threshold (0-1) |
| `BATCH_SIZE` | `50` | Records per batch operation |
| `MIN_STABLECOIN_PRICE` | `0.50` | Minimum stablecoin price filter |
| `MAX_STABLECOIN_PRICE` | `2.00` | Maximum stablecoin price filter |
| `NORMALIZE_PLATFORMS` | `true` | Enable platform name normalization |
| `CASE_INSENSITIVE_PLATFORMS` | `true` | Case insensitive platform matching |

## 📊 API-Specific Configuration

### CoinMarketCap Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `CMC_BASE_URL` | `https://pro-api.coinmarketcap.com` | CMC API base URL |
| `CMC_RATE_LIMIT` | `333` | Requests per minute |
| `CMC_DAILY_LIMIT` | `10000` | Requests per day |
| `CMC_TIMEOUT_MS` | `15000` | Request timeout |
| `CMC_RETRIES` | `3` | Number of retries |
| `CMC_RETRY_DELAY_MS` | `2000` | Retry delay |
| `CMC_BATCH_SIZE` | `5000` | Batch size for requests |
| `CMC_MAX_RESULTS` | `5000` | Maximum results per request |
| `CMC_PRICE_MIN` | `0.50` | CMC-specific price minimum |
| `CMC_PRICE_MAX` | `2.00` | CMC-specific price maximum |

### Messari Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `MESSARI_BASE_URL` | `https://data.messari.io/api` | Messari API base URL |
| `MESSARI_RATE_LIMIT` | `20` | Requests per minute |
| `MESSARI_HOURLY_LIMIT` | `1000` | Requests per hour |
| `MESSARI_TIMEOUT_MS` | `20000` | Request timeout |
| `MESSARI_RETRIES` | `3` | Number of retries |
| `MESSARI_RETRY_DELAY_MS` | `3000` | Retry delay |
| `MESSARI_USE_STABLECOIN_ENDPOINT` | `true` | Use stablecoin-specific endpoint |
| `MESSARI_INCLUDE_INACTIVE` | `false` | Include inactive stablecoins |
| `MESSARI_BATCH_SIZE` | `100` | Batch size for requests |

### CoinGecko Settings (Optional)

| Setting | Default | Description |
|---------|---------|-------------|
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | CoinGecko API base URL |
| `COINGECKO_RATE_LIMIT` | `10` | Requests per minute (free tier) |
| `COINGECKO_TIMEOUT_MS` | `10000` | Request timeout |
| `COINGECKO_RETRIES` | `2` | Number of retries |
| `COINGECKO_RETRY_DELAY_MS` | `1000` | Retry delay |

### DeFiLlama Settings (Optional)

| Setting | Default | Description |
|---------|---------|-------------|
| `DEFILLAMA_BASE_URL` | `https://api.llama.fi` | DeFiLlama API base URL |
| `DEFILLAMA_RATE_LIMIT` | `30` | Requests per minute |
| `DEFILLAMA_TIMEOUT_MS` | `15000` | Request timeout |
| `DEFILLAMA_RETRIES` | `3` | Number of retries |
| `DEFILLAMA_RETRY_DELAY_MS` | `2000` | Retry delay |
| `DEFILLAMA_INCLUDE_BRIDGES` | `false` | Include bridge data |
| `DEFILLAMA_MIN_MCAP` | `1000000` | Minimum market cap threshold |

## 🏥 Health Monitoring Configuration

### Core Health Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `HEALTH_MONITORING` | `true` | Enable health monitoring |
| `HEALTH_CHECK_INTERVAL_MS` | `60000` | Health check frequency |
| `ERROR_RATE_THRESHOLD` | `0.2` | Error rate for degraded mode (0-1) |
| `RESPONSE_TIME_THRESHOLD_MS` | `10000` | Response time alert threshold |
| `DEGRADED_MODE_THRESHOLD` | `0.7` | Health score for degraded mode |
| `MIN_HEALTHY_SOURCES` | `1` | Minimum healthy sources required |
| `HEALTH_RETENTION_DAYS` | `7` | Health data retention period |

### Circuit Breaker Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CIRCUIT_BREAKER` | `true` | Enable circuit breaker pattern |
| `CIRCUIT_BREAKER_FAILURES` | `5` | Failures before opening circuit |
| `CIRCUIT_BREAKER_TIMEOUT_MS` | `60000` | Circuit breaker timeout |
| `CIRCUIT_BREAKER_RESET_MS` | `300000` | Reset timeout for half-open state |

## 🧠 Memory Management

| Setting | Default | Description |
|---------|---------|-------------|
| `MEMORY_CLEANUP` | `true` | Enable automatic memory cleanup |
| `MEMORY_CLEANUP_INTERVAL_MS` | `300000` | Memory cleanup interval |
| `RETAIN_DEBUG_OBJECTS` | `false` | Retain debug objects for troubleshooting |
| `MAX_MEMORY_MB` | `512` | Maximum memory usage |

## 💾 Caching Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CACHING` | `true` | Enable caching |
| `CACHE_DEFAULT_TTL_MS` | `300000` | Default cache lifetime |
| `CACHE_MAX_SIZE` | `1000` | Maximum cache entries |
| `CACHE_TYPE` | `memory` | Cache type (memory, redis) |

## ⚡ Performance Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `PARALLEL_FETCHING` | `true` | Enable parallel API fetching |
| `FALLBACK_ENABLED` | `true` | Enable fallback to other sources |
| `API_DEFAULT_TIMEOUT_MS` | `15000` | Default API request timeout |
| `API_MAX_RETRIES` | `3` | Maximum API retry attempts |
| `API_RETRY_DELAY_MS` | `2000` | API retry delay |
| `RATE_LIMIT_BUFFER` | `0.8` | Rate limit buffer (0-1) |
| `USER_AGENT` | `StablecoinWatch/2.0` | User agent for API requests |

## 🛠️ Development Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `DEBUG_MODE` | `false` | Enable debug mode with extra logging |
| `MOCK_APIS` | `false` | Mock API responses for development |
| `LOG_REQUESTS` | `false` | Log all API requests and responses |
| `VERBOSE` | `false` | Verbose logging for troubleshooting |

## Environment-Specific Examples

### Development (.env.development)

```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_MODE=true
VERBOSE=true
UPDATE_INTERVAL_MINUTES=5
HEALTH_CHECK_INTERVAL_MS=30000
```

### Production (.env.production)

```bash
NODE_ENV=production
LOG_LEVEL=warn
DEBUG_MODE=false
MEMORY_CLEANUP=true
HEALTH_MONITORING=true
CIRCUIT_BREAKER=true
CACHING=true
```

### Testing (.env.test)

```bash
NODE_ENV=test
LOG_LEVEL=error
MOCK_APIS=true
UPDATE_INTERVAL_MINUTES=1
HEALTH_MONITORING=false
```

## Configuration Validation

The application validates configuration on startup and provides warnings for:

- Invalid port ranges
- Missing required API keys
- Invalid threshold values (must be 0-1)
- Empty enabled sources list
- Invalid URL formats
- Rate limits set too low

## Troubleshooting Configuration

### Common Issues

**Configuration not loading:**
- Check `.env` file exists in project root
- Verify environment variable syntax (no spaces around `=`)
- Check file permissions

**API keys not working:**
- Verify keys are valid and have proper permissions
- Check rate limits haven't been exceeded
- Ensure keys match the correct API provider

**Performance issues:**
- Increase `UPDATE_INTERVAL_MINUTES` for less frequent updates
- Lower rate limits if hitting API limits
- Enable caching with `CACHING=true`

**Health monitoring false alarms:**
- Adjust `ERROR_RATE_THRESHOLD` if too sensitive
- Increase `RESPONSE_TIME_THRESHOLD_MS` for slower networks
- Check `DEGRADED_MODE_THRESHOLD` setting

### Configuration Testing

Check your configuration:

```bash
# Start with verbose logging to see configuration loading
VERBOSE=true node app/app.js

# Test with mock APIs (no real API calls)
MOCK_APIS=true node app/app.js
```

## Best Practices

1. **Start Simple**: Use minimal configuration first, then add complexity
2. **Environment Separation**: Use different `.env` files for dev/prod/test  
3. **API Key Security**: Never commit API keys to version control
4. **Monitor Health**: Enable health monitoring in production
5. **Rate Limit Awareness**: Set appropriate rate limits for your API plans
6. **Memory Management**: Enable cleanup for long-running production instances

## Complete Configuration Reference

See `.env.example` in the project root for a complete configuration template with all available options and their default values.