# StablecoinWatch v2
https://www.StablecoinWatch.com

StablecoinWatch v2 is a Node.js web application that aggregates stablecoin data from multiple sources: CoinMarketCap, Messari, CoinGecko, and DeFiLlama. It merges market and supply/platform data from these APIs and includes health monitoring with circuit-breaker protections.

## What's New in v2

### Multi-API Data Aggregation
- **Multi-Source**: CoinMarketCap (market data), Messari (supply/platform data), CoinGecko (market data), DeFiLlama (cross-chain supply data)
- **Priority-Based Merging**: Intelligently merges data with configurable SOURCE_PRIORITY override system
- **Cross-Chain Supply Integration**: DeFiLlama takes absolute priority for platform/chain breakdown data
- **Enhanced Platform Coverage**: Supports 134+ blockchain platforms and networks with normalized naming
- **Rich Cross-Chain Analytics**: Detailed supply breakdowns, percentages, and dominant chain identification across 90+ networks


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
- **Data Sources**: CoinMarketCap API, Messari SDK (`@messari/sdk`), CoinGecko API, DeFiLlama API
- **Architecture**: Express app with a service container (DI) and health monitoring
- **Config**: `AppConfig` (app/runtime) + `ApiConfig` (API-specific)

### Data Sources
- **CoinMarketCap API** - Primary for market data (price, volume, market cap, rankings)
- **Messari API** - Supply data and basic platform information
- **CoinGecko API** - Secondary market data source with additional coin metadata and logo fallback
- **DeFiLlama API** - **PRIMARY** for cross-chain supply analytics across 90+ blockchain networks with detailed breakdown, percentages, and historical data  

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- API keys for data sources:
  - **CoinMarketCap API Key** (required) - Primary market data
  - **Messari API Key** (required) - Supply and platform data
  - **CoinGecko API Key** (optional) - Additional market data
  - **DeFiLlama API** (no key required) - Protocol and TVL data

### Environment Setup
Create a `.env` file (copy from `.env.example`):
```bash
# Required API Keys
CMC_API_KEY=your_coinmarketcap_key_here
MESSARI_API_KEY=your_messari_key_here

# Optional API Keys
# COINGECKO_API_KEY=your_coingecko_key_here

# Data Sources Configuration
ENABLED_SOURCES=cmc,messari,defillama,coingecko
# Optional: Override source priority for data merging (higher numbers win)
# SOURCE_PRIORITY={"cmc":10,"messari":9,"coingecko":6,"defillama":4}

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

## Debug Mode & Mock Data

During development you can run entirely against local mock JSON snapshots without hitting real APIs.

- Enable mock mode by setting either of the following in your environment (base `.env` or `.env.development`):
  - `DEBUG_MODE=true`
  - or `MOCK_APIS=true`
- In this mode, all data sources load from local files and no API keys are required. Sources are treated as enabled even if API keys are missing.
- Default mock files (at repo root):
  - CoinMarketCap: `cmc_raw_output.json`
  - Messari: `messari_raw_output.json`
  - DeFiLlama: `defillama_raw_output.json`
  - CoinGecko: `coingecko_raw_output.json`
- You can override file names per source with env vars if needed:
  - `CMC_MOCK_FILE`, `MESSARI_MOCK_FILE`, `DEFILLAMA_MOCK_FILE`, `COINGECKO_MOCK_FILE`

Example (Windows PowerShell):
```
$env:NODE_ENV="development"; $env:DEBUG_MODE="true"; npm start
```

Or add to `.env.development`:
```
DEBUG_MODE=true
ENABLED_SOURCES=cmc,messari,defillama,coingecko
```

Notes:
- Validation skips API key/base URL checks when mock mode is active.
- Health monitoring remains active; records successes against mock loads.

## Static Site Hosting on Azure

This application supports both **dynamic Express server** and **static HTML generation** modes:

### Static Deployment Features
- **Hourly Data Refresh**: GitHub Actions automatically rebuilds the site with fresh API data every hour
- **Zero Runtime Dependencies**: Fully static HTML/CSS/JS with no server required
- **Azure Static Web Apps Integration**: Automatic deployment with custom domain support
- **Template Rendering**: EJS templates compile to static HTML with all dynamic data pre-rendered

### Build Process
- `npm run build:static` generates a complete static site in `/dist`
- The build script fetches live API data and renders all pages statically
- GitHub Actions workflow triggers on push and hourly via cron schedule
- Azure automatically deploys the generated static files

### Key Configuration for Static Builds
- `HEALTH_MONITORING=false` — **Critical**: Prevents Node.js process hanging during build
- `ENABLED_SOURCES=cmc,messari,coingecko,defillama` — Use all data sources for comprehensive data
- API keys configured via GitHub Secrets for secure CI/CD deployment

### Documentation
- **Setup Guide**: `docs/azure-first-time-setup.md` — Complete Azure + GitHub setup walkthrough
- **Technical Details**: `docs/static-site-deployment.md` — Build process, CI/CD, and troubleshooting
- **Environment Variables**: See `CLAUDE.md` for comprehensive configuration reference

### Access
- **Production Site**: https://stablecoinwatch.com (custom domain)
- **Azure Default URL**: https://gray-grass-0e64edb0f.1.azurestaticapps.net

## Project Structure

### Application Layer
```
app/
+-- app.js                           # Express server & service container (DI), lifecycle
// hybrid-stablecoin-service.js     (removed; replaced by services/HybridTransformer.js)
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

### Standardized Stablecoin Format
- Each data source transformer returns a common object shape used for merging. See `docs/standardized-stablecoin-format.md` for the schema and per-source behavior.

### Data Flow Architecture

1. **Multi-Source Data Fetching**:
   - **CoinMarketCap**: Fetches market data filtered by stablecoin tags and price range ($0.50-$2.00)
   - **Messari**: Fetches supply data and basic platform information via stablecoin metrics endpoint
   - **CoinGecko**: Provides additional market data, coin metadata, and logo fallback
   - **DeFiLlama**: **PRIMARY** source for cross-chain supply analytics across 90+ blockchain networks
   - **Performance Optimization**: Large datasets (>1000 records) use async batching with 500-1000 record batches
   - **Non-blocking Processing**: `setImmediate` yields between batches to maintain application responsiveness
   - **Pre-compiled Patterns**: Regex patterns and Sets are pre-compiled in constructors for optimal performance
   - **Health Monitoring**: Tracks API performance, error rates, and response times

2. **Enhanced Priority-Based Data Merging** (interval via `UPDATE_INTERVAL_MINUTES`):
   - Exact symbol matching between data sources
   - Name similarity matching for unmatched coins
   - **Configurable SOURCE_PRIORITY**: Environment-based priority override system for flexible data source selection
   - **DeFiLlama Cross-Chain Priority**: Absolute priority for platform/chain supply breakdowns
   - **Metadata Field Priority**: Priority-aware selection for description, website, logo, and dateAdded fields
   - Platform name normalization supporting 70+ platform name variations

3. **Enhanced Data Processing Pipeline**:
   - Shape stablecoin data for UI consumption (`coin.main`, `coin.msri`, `coin.scw`, `coin.cmc`, `coin.cgko`)
   - **Cross-Chain Data Enrichment**: Populate `chainSupplyBreakdown`, `totalCrossChainSupply`, `dominantChain`
   - Extract and normalize platform information across 134 supported platforms
   - **Enhanced Platform Model**: Supply amounts, percentages, and historical data (prev day/week/month)
   - Compute aggregate totals and platform rollups
   - Apply data quality checks and validation with confidence scoring

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

### Data Source Control
- `ENABLED_SOURCES` — Comma-separated list of sources to use (e.g., `cmc,messari,coingecko,defillama`).
- `SOURCE_PRIORITY` — Optional JSON to override per-source priority in merge selection. Higher wins. If a source isn't present in the JSON, its built-in priority from `ApiConfig` is used. Example:
  - `SOURCE_PRIORITY={"cmc":10,"messari":9,"coingecko":6,"defillama":4}`

## Enhanced Data Structures

### Cross-Chain Supply Data
The application now provides comprehensive cross-chain supply breakdowns:

```javascript
{
  chainSupplyBreakdown: {
    "Ethereum": {
      supply: 45000000000,
      percentage: 61.7,
      historical: {
        prevDay: 44900000000,
        prevWeek: 44500000000,
        prevMonth: 43000000000
      }
    },
    "Tron": {
      supply: 33500000000,
      percentage: 46.0,
      historical: { /* ... */ }
    }
    // ... additional chains
  },
  totalCrossChainSupply: 72900000000,
  dominantChain: "Ethereum"
}
```

### Enhanced Platform Model
Platform instances now include rich supply data:

```javascript
{
  name: "Ethereum",
  contract_address: "0x...",
  total_supply: 45000000000,
  circulating_supply: 45000000000,
  supply_percentage: 61.7,
  historical_data: {
    prevDay: 44900000000,
    prevWeek: 44500000000,
    prevMonth: 43000000000
  }
}
```

### Supported Blockchain Networks
The application supports 90+ blockchain networks including:
- **Major Chains**: Ethereum, Tron, BSC, Polygon, Solana, Avalanche
- **Layer 2s**: Arbitrum, Optimism, Base, Linea, Scroll, Blast, zkSync Era
- **Emerging Chains**: Sui, Aptos, Manta, TON, Mantle, ThunderCore
- **Specialized**: Bitcoin (Omni), Stellar, Algorand, NEAR, Flow, Hedera
- **Additional**: Fantom, Celo, Harmony, Moonbeam, Kava, Osmosis, Terra, Injective, Cosmos Hub, and many more

## Current Capabilities & Limitations

### What's Working
- **Multi-API Integration**: 4-source data aggregation (CMC, Messari, CoinGecko, DeFiLlama)
- **Cross-Chain Supply Analytics**: Comprehensive supply breakdown across 90+ blockchain networks
- **Priority-Based Data Merging**: Configurable SOURCE_PRIORITY system with metadata field priority-awareness
- **Enhanced Platform Coverage**: 134 supported platforms with normalized naming and rich supply data
- **DeFiLlama Integration**: Primary source for cross-chain data with detailed breakdowns and historical tracking
- **Platform Normalization**: 70+ platform name variations mapped to consistent display names
- **Health Monitoring**: Real-time API performance tracking with confidence scoring
- **Circuit Breakers**: Automatic failure prevention with degraded mode fallback
- **Enhanced Error Handling**: Improved fallback mechanisms and retry logic

### Known Limitations
- Supply amount features temporarily disabled (see issue #31)
- Some cross-chain contract addresses may be incomplete
- Health monitoring dashboard UI not yet implemented
- Test suite not configured (`npm test` returns error)

## Performance Tuning (Advanced)

The application includes several performance optimizations that can be configured:

### Async Batching Configuration
- **Threshold**: Filtering automatically switches to async batching at 1000+ records to prevent main thread blocking
- **Batch Sizes**: 
  - **CoinMarketCap**: 1000 records per batch (processes up to 5000 coins)
  - **Messari**: 500 records per batch 
  - **DeFiLlama**: 500 records per batch
- **Event Loop Management**: `setImmediate()` yields between batches maintain UI responsiveness

### Performance Optimizations
- **Pre-compiled Patterns**: Regex patterns and Sets are initialized once in constructors for optimal filtering
- **O(1) Lookups**: Tag checking uses Set-based lookups instead of array searching
- **Pattern Caching**: Stablecoin detection patterns are pre-compiled to eliminate recreation overhead

### Performance Metrics
Recent optimizations deliver significant improvements:
- **CoinMarketCap**: 5x faster filtering (50-100ms → 10-20ms)
- **DeFiLlama**: 4-5x faster filtering (200-500ms → 50-100ms)  
- **Messari**: 4x faster filtering (20-50ms → 5-10ms)

### Monitoring Performance
- Health endpoints (`/api/health`, `/status`) include response time metrics
- Circuit breaker protects against slow/failing APIs
- Console logs show refresh cycle timing and record counts

## Troubleshooting

### Common Issues

**Empty stablecoin list or startup errors:**
- Verify required API keys (`CMC_API_KEY` and `MESSARI_API_KEY`) are set and valid
- Check `ENABLED_SOURCES` configuration includes your desired data sources
- Check API key permissions and rate limits
- Ensure outbound HTTPS access is available

**Rate limit errors (429 responses):**
- Check your API plan limits on CoinMarketCap/Messari dashboards
- Consider upgrading API plans for higher limits

**Performance issues:**
- Check `/api/health` endpoint for response time metrics and API health status
- Monitor console logs during refresh cycles for filtering timing
- Large datasets (>5000 records) automatically use async batching to prevent blocking
- Enable circuit breakers: `CIRCUIT_BREAKER=true`
- Verify regex pattern pre-compilation is working (no repeated pattern creation in logs)

**Data inconsistencies:**
- Check health monitoring for API failures

## Contributing

Contributions welcome!

### Development Guidelines
- Follow existing code patterns and conventions
- Add tests for new functionality (when test framework is established)
- Update documentation for changes
- Keep changes focused and atomic






