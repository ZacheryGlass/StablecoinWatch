# StablecoinWatch v2
https://www.StablecoinWatch.com

StablecoinWatch v2 is a robust, scalable web application that aggregates stablecoin data from multiple sources to provide comprehensive market coverage. Built with a modern, service-oriented architecture, it combines the best data from CoinMarketCap, Messari, and other APIs with intelligent data merging, health monitoring, and reliability features.

## 🚀 What's New in v2

### Multi-API Data Aggregation
- **Hybrid Architecture**: Combines CoinMarketCap (market data) + Messari (supply/platform data)
- **Intelligent Merging**: Priority-based data merging with confidence scoring
- **Platform Normalization**: Converts raw ecosystem IDs to readable blockchain names
- **Extensible Design**: Ready to add CoinGecko, DeFiLlama, and other data sources

### Enterprise-Grade Reliability
- **Health Monitoring**: Real-time monitoring of all data sources with alerts
- **Circuit Breaker Pattern**: Prevents cascade failures from unhealthy APIs
- **Automatic Recovery**: Smart retry logic with exponential backoff
- **Degraded Mode**: Graceful fallback when services become unavailable

### Advanced Configuration
- **200+ Configuration Options**: Comprehensive environment-based configuration
- **Per-API Settings**: Individual rate limiting, timeouts, and retry policies
- **Development Features**: Mock APIs, debug logging, and health dashboards

## 🏗️ Architecture

### Current Stack
- **Runtime**: Node.js + Express + EJS templating
- **Data Sources**: CoinMarketCap API + Messari SDK (`@messari/sdk`)
- **Architecture**: Service-oriented with dependency injection (migrating)
- **Reliability**: Health monitoring, circuit breakers, memory management

### Data Sources
- **CoinMarketCap API** - Primary for market data (price, volume, market cap, rankings)
- **Messari API** - Primary for supply data and cross-chain platform breakdown  
- **Ready to Add**: CoinGecko, DeFiLlama (pre-configured, just add API keys)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- API keys for data sources:
  - **CoinMarketCap API Key** (required) - Primary market data
  - **Messari API Key** (required) - Supply and platform data
  - **CoinGecko API Key** (optional) - Additional market data

### Environment Setup
Create a `.env` file (copy from `.env.example`):
```bash
# Required API Keys
CMC_API_KEY=your_coinmarketcap_key_here
MESSARI_API_KEY=your_messari_key_here

# Optional API Keys
COINGECKO_API_KEY=your_coingecko_key_here

# Server Configuration
PORT=3000
UPDATE_INTERVAL_MINUTES=15

# Data Sources (comma-separated)
ENABLED_SOURCES=cmc,messari

# Health Monitoring
HEALTH_MONITORING=true
CIRCUIT_BREAKER=true
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

## 📁 Project Structure

### Application Layer
```
app/
├── app.js                           # Express server & service initialization
├── hybrid-stablecoin-service.js     # Legacy hybrid service (being refactored)
└── util.js                          # Formatting & utility functions
```

### New Architecture (Phase 1 Complete)
```
interfaces/
├── IDataFetcher.js                  # Pluggable data source interface
├── IStablecoinDataService.js        # Main service contract
└── IHealthMonitor.js                # Health monitoring interface

config/
├── AppConfig.js                     # Application configuration
└── ApiConfig.js                     # API-specific configurations

services/
└── HealthMonitor.js                 # Health monitoring implementation
```

### Web Interface
```
routes/
└── routes.js                        # Express route definitions

views/                               # EJS templates
├── home.ejs                         # Main stablecoin table
├── coins.ejs                        # Individual coin details
├── platforms.ejs                    # Platform overview
└── partials/                        # Reusable template components

res/                                 # Static assets
├── css/                             # Stylesheets
├── js/                              # Client-side JavaScript
└── images/                          # Icons and graphics
```

### Data & Documentation
```
models/
├── stablecoin.js                    # Stablecoin data model
└── platform.js                     # Platform/blockchain model

docs/
└── messari/                         # API reference documentation
```

## ⚙️ How It Works

### Data Flow Architecture

1. **Multi-Source Data Fetching**:
   - **CoinMarketCap**: Fetches market data filtered by stablecoin tags and price range ($0.50-$2.00)
   - **Messari**: Fetches supply data and cross-chain platform breakdown via `/metrics/v2/stablecoins`
   - **Health Monitoring**: Tracks API performance, error rates, and response times

2. **Intelligent Data Merging** (every 15 minutes):
   - Exact symbol matching between data sources
   - Name similarity matching for unmatched coins
   - Priority-based data selection (CMC for market data, Messari for supply data)
   - Platform name normalization (converts ecosystem IDs to readable names)
   - Confidence scoring based on source consensus

3. **Data Processing Pipeline**:
   - Shape stablecoin data for UI consumption (`coin.main`, `coin.msri`, `coin.scw`)
   - Extract and normalize platform information
   - Compute aggregate totals and platform rollups
   - Apply data quality checks and validation

4. **Health & Reliability**:
   - Circuit breaker pattern prevents cascade failures
   - Automatic retry with exponential backoff
   - Degraded mode fallback when APIs become unhealthy
   - Real-time health monitoring and alerting

## 🌐 API Routes & Pages

### Public Pages
- **`/`** - Home page with comprehensive stablecoin table (price, market cap, volume, platforms)
- **`/coins/:symbol`** - Detailed coin page with multi-chain breakdown and metrics
- **`/platforms`** - Platform summary showing all supported blockchains
- **`/platforms/:name`** - Individual platform details with coin listings

### Health & Monitoring
- **`/api/health`** - JSON health status (system + sources)
- **`/health`** - System health dashboard (planned)
- **`/metrics`** - Performance metrics (planned)

## ⚙️ Configuration & Tuning

### Core Settings
- **`PORT`** - Web server port (default: 3000)
- **`UPDATE_INTERVAL_MINUTES`** - Data refresh interval (default: 15)
- **`ENABLED_SOURCES`** - Active data sources: "cmc,messari,coingecko"

### API Configuration
- **`CMC_API_KEY`** - CoinMarketCap API key (required)
- **`MESSARI_API_KEY`** - Messari API key (required)  
- **`COINGECKO_API_KEY`** - CoinGecko API key (optional)
- **`CMC_RATE_LIMIT`** - Requests per minute for CMC (default: 333)
- **`MESSARI_RATE_LIMIT`** - Requests per minute for Messari (default: 20)

### Health Monitoring
- **`HEALTH_MONITORING`** - Enable health tracking (default: true)
- **`CIRCUIT_BREAKER`** - Enable circuit breaker (default: true)
- **`ERROR_THRESHOLD`** - Error rate for circuit breaker (default: 0.5)
- **`DEGRADED_MODE_THRESHOLD`** - Health score for degraded mode (default: 30)

### Development
- **`NODE_ENV`** - Environment (development/production)
- **`DEBUG_LOGGING`** - Verbose logging (default: false)
- **`MOCK_APIS`** - Use mock data for testing (default: false)

See `.env.example` for all 200+ configuration options.

## 📋 Current Capabilities & Limitations

### What's Working
- **Multi-API Integration**: CoinMarketCap + Messari hybrid data aggregation
- **Platform Normalization**: Readable blockchain names (Ethereum, Tron, etc.)
- **Health Monitoring**: Real-time API performance tracking
- **Circuit Breakers**: Automatic failure prevention
- **Comprehensive Configuration**: 200+ environment options
- **Extensible Architecture**: Ready for CoinGecko, DeFiLlama integration

### Known Limitations
- Supply amount features temporarily disabled (see issue #31)
- Some cross-chain contract addresses may be incomplete
- Health monitoring dashboard UI not yet implemented
- Test suite not configured (`npm test` returns error)

## 🔧 Troubleshooting

### Common Issues

**Empty stablecoin list or startup errors:**
- Verify both `CMC_API_KEY` and `MESSARI_API_KEY` are set and valid
- Check API key permissions and rate limits
- Ensure outbound HTTPS access is available

**Rate limit errors (429 responses):**
- Check your API plan limits on CoinMarketCap/Messari dashboards
- Adjust rate limits in configuration: `CMC_RATE_LIMIT`, `MESSARI_RATE_LIMIT`
- Consider upgrading API plans for higher limits

**Performance issues:**
- Monitor health metrics for slow APIs
- Enable circuit breakers: `CIRCUIT_BREAKER=true`
- Adjust update interval: `UPDATE_INTERVAL_MINUTES=30`

**Data inconsistencies:**
- Check health monitoring for API failures
- Verify enabled sources: `ENABLED_SOURCES=cmc,messari`
- Review confidence scoring for data quality issues

## 🤝 Contributing

Contributions welcome! The project is undergoing architectural improvements to support multiple APIs.

### Current Focus Areas
- **Phase 2**: Service layer refactoring (breaking up monolithic service)
- **Phase 3**: Dependency injection and route migration  
- **Phase 4**: Performance optimization and caching

### Development Guidelines
- Follow existing code patterns and conventions
- Add tests for new functionality (when test framework is established)
- Update documentation for architectural changes
- Keep changes focused and atomic
- Consider multi-API compatibility for new features

### Architecture Migration
The codebase is transitioning from a monolithic service to a pluggable, service-oriented architecture. New contributions should align with the interface-based design in the `interfaces/` and `services/` directories.

See `CLAUDE.md` for detailed architecture documentation and development commands.


