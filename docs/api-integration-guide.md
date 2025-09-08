# API Integration Guide
> Status: Active implementation. The pluggable architecture is operational with CMC, Messari, CoinGecko, and DeFiLlama integrations. ApiConfig and IDataFetcher implementations are actively used in production.


This guide explains how to integrate new data sources into StablecoinWatch's pluggable architecture.

## Overview

StablecoinWatch uses a service-oriented architecture with pluggable data sources. Adding new APIs (like CoinGecko, DeFiLlama, or others) is designed to be straightforward using the existing interface contracts.

## Current Data Sources

- **CoinMarketCap API** - Market data (price, volume, market cap, rankings) - Active
- **Messari API** - Supply data and cross-chain platform breakdown - Active
- **CoinGecko API** - Additional market data and coin metadata - Active
- **DeFiLlama API** - Protocol TVL and cross-chain analytics - Active

## Architecture

### Interface Contracts

All data sources implement the `IDataFetcher` interface located in `interfaces/IDataFetcher.js`. This ensures consistency and interoperability across all APIs.

Key interface methods:
- `fetchStablecoinData()` - Primary data fetching
- `getCapabilities()` - Declare what data this source provides
- `getHealthStatus()` - Health monitoring integration
- `validateConfig()` - Configuration validation

### Configuration System

API configurations are centralized in `config/ApiConfig.js`. Each data source has:
- Base URLs and endpoints
- Rate limiting settings
- Capability declarations
- Priority levels for data merging
- Health monitoring thresholds

## Adding a New Data Source

### Step 1: Create the Data Fetcher

Create a new file `services/[SourceName]DataFetcher.js`:

```javascript
const IDataFetcher = require('../interfaces/IDataFetcher');

class CoinGeckoDataFetcher extends IDataFetcher {
    constructor(config, healthMonitor) {
        super();
        this.config = config;
        this.healthMonitor = healthMonitor;
        this.sourceId = 'coingecko';
        this.sourceName = 'CoinGecko';
    }

    async fetchStablecoinData(options = {}) {
        const startTime = Date.now();
        
        try {
            // Implement your API call here
            const response = await this.makeApiCall('/coins/markets', {
                vs_currency: 'usd',
                category: 'stablecoins',
                order: 'market_cap_desc',
                per_page: 250,
                page: 1,
                sparkline: false
            });

            // Transform to standard format
            const stablecoins = this.transformData(response.data);

            // Record success metrics
            await this.healthMonitor.recordSuccess(this.sourceId, {
                operation: 'fetchStablecoinData',
                duration: Date.now() - startTime,
                recordCount: stablecoins.length,
                timestamp: Date.now()
            });

            return stablecoins;

        } catch (error) {
            // Record failure metrics
            await this.healthMonitor.recordFailure(this.sourceId, {
                operation: 'fetchStablecoinData',
                errorType: this.categorizeError(error),
                message: error.message,
                statusCode: error.response?.status,
                retryable: this.isRetryable(error),
                timestamp: Date.now()
            });
            
            throw error;
        }
    }

    transformData(rawData) {
        return rawData.map(coin => ({
            // Standard stablecoin format
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            priceChange24h: coin.price_change_percentage_24h,
            
            // Source metadata
            sourceData: {
                coingecko: {
                    id: coin.id,
                    lastUpdated: coin.last_updated,
                    // Store raw data for debugging
                    raw: coin
                }
            },
            
            // Data quality indicators
            confidence: this.calculateConfidence(coin),
            lastUpdated: new Date(coin.last_updated).getTime()
        }));
    }

    getCapabilities() {
        return {
            providesMarketData: true,
            providesSupplyData: false,
            providesPlatformData: false,
            providesHistoricalData: true,
            supportedOperations: ['fetchStablecoinData', 'fetchHistoricalData'],
            updateFrequency: '1min',
            dataQuality: 'high'
        };
    }

    async validateConfig() {
        const required = ['apiKey', 'baseUrl'];
        const missing = required.filter(field => !this.config[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required config: ${missing.join(', ')}`);
        }

        // Test API connectivity
        try {
            await this.makeApiCall('/ping');
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: `API connectivity test failed: ${error.message}` 
            };
        }
    }
}

module.exports = CoinGeckoDataFetcher;
```

### Step 2: Update API Configuration

Add your data source to `config/ApiConfig.js`:

```javascript
const apiConfigs = {
    // ... existing configs ...
    
    coingecko: {
        name: 'CoinGecko',
        baseUrl: 'https://api.coingecko.com/api/v3',
        apiKey: process.env.COINGECKO_API_KEY,
        endpoints: {
            stablecoins: '/coins/markets',
            historical: '/coins/{id}/market_chart'
        },
        rateLimit: {
            requestsPerMinute: 50, // Adjust based on your plan
            burstLimit: 10
        },
        capabilities: {
            providesMarketData: true,
            providesSupplyData: false,
            providesPlatformData: false,
            dataQuality: 'high',
            priority: 6 // Lower than CMC (10) but higher than others
        },
        healthThresholds: {
            responseTime: 5000,
            errorRate: 0.1,
            circuitBreakerThreshold: 5
        },
        retryConfig: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
        }
    }
};
```

### Step 3: Register the Data Source

Update the service initialization code to include your new fetcher:

```javascript
// In app/app.js or your service container
const CoinGeckoDataFetcher = require('./services/CoinGeckoDataFetcher');

// Register the new data source
const coinGeckoFetcher = new CoinGeckoDataFetcher(
    apiConfigs.coingecko,
    healthMonitor
);

// Add to your data service
dataService.registerDataSource('coingecko', coinGeckoFetcher);
```

### Step 4: Environment Configuration

Add environment variables to `.env`:

```bash
# CoinGecko Configuration
COINGECKO_API_KEY=your_coingecko_api_key_here
COINGECKO_RATE_LIMIT=50
COINGECKO_ENABLED=true

# Update enabled sources  
ENABLED_SOURCES=cmc,messari,coingecko,defillama
```

## Data Merging Strategy

### Priority-Based Merging

Data sources have priority levels that determine which data is used when multiple sources provide the same information:

- **Priority 10**: CoinMarketCap (market data)
- **Priority 8**: Messari (supply data)
- **Priority 6**: CoinGecko (market data)
- **Priority 4**: DeFiLlama (supply data)

### Confidence Scoring

Each data point receives a confidence score based on:
- Source reliability
- Data freshness
- Cross-source consensus
- Historical accuracy

### Matching Algorithm

1. **Exact Symbol Match**: Primary matching by ticker symbol
2. **Name Similarity**: Fuzzy matching on coin names
3. **ID Mapping**: Cross-reference known ID mappings
4. **Manual Overrides**: Configured mappings for edge cases

## Health Monitoring Integration

### Automatic Health Tracking

Your data fetcher automatically participates in health monitoring:

- **Response Times**: Tracked on every API call
- **Error Rates**: Categorized by error type (network, parsing, rate limit)
- **Circuit Breakers**: Automatic failure prevention
- **Success Metrics**: Data quality and completeness tracking

### Health Status Reporting

Implement `getHealthStatus()` to provide custom health indicators:

```javascript
async getHealthStatus() {
    return {
        operational: this.isOperational,
        lastSuccessfulFetch: this.lastSuccessfulFetch,
        consecutiveFailures: this.consecutiveFailures,
        customMetrics: {
            dataFreshness: this.calculateDataFreshness(),
            apiQuotaUsage: this.getQuotaUsage()
        }
    };
}
```

## Testing Your Integration

### Unit Tests

Create comprehensive tests for your data fetcher:

```javascript
describe('CoinGeckoDataFetcher', () => {
    test('should fetch stablecoin data successfully', async () => {
        const fetcher = new CoinGeckoDataFetcher(mockConfig, mockHealthMonitor);
        const data = await fetcher.fetchStablecoinData();
        
        expect(data).toBeDefined();
        expect(data.length).toBeGreaterThan(0);
        expect(data[0]).toHaveProperty('symbol');
        expect(data[0]).toHaveProperty('price');
    });

    test('should handle API errors gracefully', async () => {
        // Test error scenarios
    });

    test('should validate configuration correctly', async () => {
        // Test config validation
    });
});
```

### Integration Testing

Test with the full system:

```bash
# Enable only your new source for testing
ENABLED_SOURCES=coingecko node app/app.js

# Test with multiple sources
ENABLED_SOURCES=cmc,messari,coingecko node app/app.js
```

## Best Practices

### Error Handling

- **Categorize Errors**: Network, parsing, rate limit, authentication
- **Retry Logic**: Implement exponential backoff for transient failures  
- **Circuit Breakers**: Respect circuit breaker status
- **Graceful Degradation**: Continue operating if this source fails

### Performance

- **Efficient API Usage**: Minimize requests, use bulk endpoints
- **Caching**: Implement intelligent caching strategies
- **Rate Limiting**: Respect API limits and user quotas
- **Parallel Processing**: Where possible, fetch data in parallel

### Data Quality

- **Validation**: Validate data before returning
- **Normalization**: Convert to standard formats consistently
- **Completeness**: Handle missing data gracefully
- **Freshness**: Track and report data age

### Security

- **API Key Management**: Never log or expose API keys
- **Input Sanitization**: Validate all external data
- **HTTPS Only**: Always use secure connections
- **Rate Limit Compliance**: Respect API provider limits

## Troubleshooting

### Common Issues

**Data not appearing in results:**
- Check `ENABLED_SOURCES` includes your source ID
- Verify API key is valid and has proper permissions
- Check health monitoring for failure alerts
- Review data transformation logic

**Poor performance:**
- Check rate limiting configuration
- Review API response times in health monitoring
- Optimize API usage patterns
- Consider caching strategies

**Data quality issues:**
- Review confidence scoring algorithm
- Check data validation logic
- Compare with other sources for consistency
- Monitor health metrics for anomalies

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
DEBUG_LOGGING=true node app/app.js
```

This provides detailed logs of:
- API requests and responses
- Data transformation steps
- Health monitoring events
- Error details and stack traces

## Future Considerations

### Scalability

The architecture is designed to handle many data sources efficiently:
- Service registration is dynamic
- Health monitoring scales automatically
- Configuration is centralized but flexible
- Data merging handles any number of sources

### New Capabilities

When adding sources with new capabilities:
- Extend the `IDataFetcher` interface if needed
- Update data models to support new fields
- Consider UI changes to display new data types
- Update documentation and examples

### Migration Path

If you need to change existing integrations:
- Phase rollout using feature flags
- Maintain backward compatibility during transitions
- Update documentation for any breaking changes
- Provide clear migration instructions for users
