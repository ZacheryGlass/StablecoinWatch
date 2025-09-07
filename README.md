# StablecoinWatch v2
https://www.StablecoinWatch.com

StablecoinWatch v2 is a Node.js web application that aggregates stablecoin data from CoinMarketCap and Messari. It merges market and supply/platform data and includes health monitoring with circuit-breaker protections.

## What's New in v2

### Multi-API Data Aggregation
- **Hybrid**: CoinMarketCap (market data) + Messari (supply/platform data)
- **Source-aware Merging**: Uses CMC for market metrics and Messari for supply/platform details
- **Platform Normalization**: Converts raw ecosystem IDs to readable blockchain names


### Reliability
- **Health Monitoring**: Real-time monitoring of data sources with alerts
- **Circuit Breaker**: Prevents cascade failures from unhealthy APIs
- **Degraded Mode**: Health scoring and gating via circuit breaker


### Architecture & Config
- Service container with dependency injection (no globals)
- Centralized configuration via `AppConfig` and `ApiConfig`
- Environment-specific overrides with `.env.<NODE_ENV>`

##? Architecture

### Current Stack
- **Runtime**: Node.js + Express + EJS templating
- **Data Sources**: CoinMarketCap API + Messari SDK (`@messari/sdk`)
- **Architecture**: Express app with a service container (DI) and health monitoring
- **Config**: `AppConfig` (app/runtime) + `ApiConfig` (API-specific)

### Data Sources
- **CoinMarketCap API** - Primary for market data (price, volume, market cap, rankings)
- **Messari API** - Primary for supply data and cross-chain platform breakdown  

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- API keys for data sources:
  - **CoinMarketCap API Key** (required) - Primary market data
  - **Messari API Key** (required) - Supply and platform data

### Environment Setup
Create a `.env` file (copy from `.env.example`):
```bash
# Required API Keys
CMC_API_KEY=your_coinmarketcap_key_here
MESSARI_API_KEY=your_messari_key_here

# Server
PORT=3000
NODE_ENV=production
# Data refresh (minutes)
UPDATE_INTERVAL_MINUTES=15

# Data processing
MATCH_THRESHOLD=0.8
MIN_STABLECOIN_PRICE=0.5
MAX_STABLECOIN_PRICE=2.0

# Health Monitoring (active)
HEALTH_MONITORING=true
HEALTH_CHECK_INTERVAL_MS=60000
ERROR_RATE_THRESHOLD=0.2
RESPONSE_TIME_THRESHOLD_MS=10000
DEGRADED_MODE_THRESHOLD=0.7
MIN_HEALTHY_SOURCES=1
HEALTH_RETENTION_DAYS=7

# Circuit Breaker (active)
CIRCUIT_BREAKER=true
CIRCUIT_BREAKER_FAILURES=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000
CIRCUIT_BREAKER_RESET_MS=300000
```

### Installation & Launch
```bash
# Install dependencies
npm install

# Start the application
npm start
# or directly:
node app/app.js
```

The application will be available at `http://localhost:3000` (or your configured PORT).

Environment-specific overrides: create `.env.<NODE_ENV>` (for example, `.env.production`) to override values from the base `.env`.

## Project Structure

### Application Layer
```
app/
+-- app.js                           # Express server & service container (DI), lifecycle
+-- hybrid-stablecoin-service.js     # Hybrid service (CMC + Messari)
+-- util.js                          # Formatting & utility functions
```

### Monitoring & Config
```
interfaces/
+-- IDataFetcher.js                  # Pluggable data source interface
+-- IStablecoinDataService.js        # Main service contract
+-- IHealthMonitor.js                # Health monitoring interface

config/
+-- AppConfig.js                     # Application configuration (active)
+-- ApiConfig.js                     # API-specific configurations (integrated)

services/
+-- HealthMonitor.js                 # Health monitoring implementation
```

### Web Interface
```
routes/
+-- routes.js                        # Express route definitions

views/                               # EJS templates
+-- home.ejs                         # Main stablecoin table
+-- coins.ejs                        # Individual coin details
+-- platforms.ejs                    # Platform overview
+-- partials/                        # Reusable template components

res/                                 # Static assets
+-- css/                             # Stylesheets
+-- js/                              # Client-side JavaScript
+-- images/                          # Icons and graphics
```

### Data & Documentation
```
models/
+-- stablecoin.js                    # Stablecoin data model
+-- platform.js                     # Platform/blockchain model

docs/
+-- messari/                         # API reference documentation
```

## How It Works

### Data Flow Architecture

1. **Multi-Source Data Fetching**:
   - **CoinMarketCap**: Fetches market data filtered by stablecoin tags and price range ($0.50-$2.00)
   - **Messari**: Fetches supply data and cross-chain platform breakdown via `/metrics/v2/stablecoins`
   - **Health Monitoring**: Tracks API performance, error rates, and response times

2. **Intelligent Data Merging** (interval via `UPDATE_INTERVAL_MINUTES`):
   - Exact symbol matching between data sources
   - Name similarity matching for unmatched coins
   - Priority-based data selection (CMC for market data, Messari for supply data)
   - Platform name normalization (converts ecosystem IDs to readable names)

3. **Data Processing Pipeline**:
   - Shape stablecoin data for UI consumption (`coin.main`, `coin.msri`, `coin.scw`)
   - Extract and normalize platform information
   - Compute aggregate totals and platform rollups
   - Apply data quality checks and validation

4. **Health & Reliability**:
   - Circuit breaker pattern prevents cascade failures
   - Degraded mode fallback when APIs become unhealthy
   - Real-time health monitoring and alerting

## API Routes & Pages

### Public Pages
- **`/`** - Home page with comprehensive stablecoin table (price, market cap, volume, platforms)
- **`/coins/:symbol`** - Detailed coin page with multi-chain breakdown and metrics
- **`/platforms`** - Platform summary showing all supported blockchains
- **`/platforms/:name`** - Individual platform details with coin listings

### Health & Monitoring
- **`/api/health`** - JSON health status (system + sources)
- **`/status`** - System health status page (HTML)

## Configuration & Tuning

### Core Settings (Active)
- `PORT` — Web server port (default: 3000)
- `UPDATE_INTERVAL_MINUTES` - Data refresh cadence (default: 15)

### API Keys (Active)
- `CMC_API_KEY` — CoinMarketCap API key (required)
- `MESSARI_API_KEY` — Messari API key (required)

### Health Monitoring (Active)
- `HEALTH_MONITORING` — Enable health tracking (default: true)
- `HEALTH_CHECK_INTERVAL_MS` — Health check interval (default: 60000)
- `ERROR_RATE_THRESHOLD` — Error rate threshold (default: 0.2)
- `RESPONSE_TIME_THRESHOLD_MS` — Response time threshold (default: 10000)
- `DEGRADED_MODE_THRESHOLD` — Degraded mode threshold (default: 0.7)
- `MIN_HEALTHY_SOURCES` — Minimum healthy sources (default: 1)
- `HEALTH_RETENTION_DAYS` — Health data retention (default: 7)

### Circuit Breaker (Active)
- `CIRCUIT_BREAKER` — Enable circuit breaker (default: true)
- `CIRCUIT_BREAKER_FAILURES` — Failures before open (default: 5)
- `CIRCUIT_BREAKER_TIMEOUT_MS` — Open timeout (default: 60000)
- `CIRCUIT_BREAKER_RESET_MS` — Reset timeout (default: 300000)

## Current Capabilities & Limitations

### What's Working
- **Multi-API Integration**: CoinMarketCap + Messari hybrid data aggregation
- **Platform Normalization**: Readable blockchain names (Ethereum, Tron, etc.)
- **Health Monitoring**: Real-time API performance tracking
- **Circuit Breakers**: Automatic failure prevention

### Known Limitations
- Supply amount features temporarily disabled (see issue #31)
- Some cross-chain contract addresses may be incomplete
- Health monitoring dashboard UI not yet implemented
- Test suite not configured (`npm test` returns error)

## Troubleshooting

### Common Issues

**Empty stablecoin list or startup errors:**
- Verify both `CMC_API_KEY` and `MESSARI_API_KEY` are set and valid
- Check API key permissions and rate limits
- Ensure outbound HTTPS access is available

**Rate limit errors (429 responses):**
- Check your API plan limits on CoinMarketCap/Messari dashboards
- Consider upgrading API plans for higher limits

**Performance issues:**
- Monitor health metrics for slow APIs
- Enable circuit breakers: `CIRCUIT_BREAKER=true`

**Data inconsistencies:**
- Check health monitoring for API failures

## Contributing

Contributions welcome!

### Development Guidelines
- Follow existing code patterns and conventions
- Add tests for new functionality (when test framework is established)
- Update documentation for changes
- Keep changes focused and atomic






