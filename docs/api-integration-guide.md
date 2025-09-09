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

Key interface methods (must implement):
- `getSourceId()` and `getSourceName()`
- `isConfigured()`
- `fetchStablecoins()` — Primary data fetching (returns raw, source-native list)
- `transformToStandardFormat(rawData)` — Convert raw payload to standardized records
- `getCapabilities()` — Declare data types and priority for merging
- `getHealthStatus()` — Health monitoring integration
- `getRateLimitInfo()` — Rate limiting metadata

For the canonical object schema produced by `transformToStandardFormat`, see `docs/standardized-stablecoin-format.md`.

### Configuration System

API configurations are centralized in `config/ApiConfig.js`. Each data source has:
- Base URLs and endpoints
- Rate limiting settings
- Capability declarations
- Priority levels for data merging
- Health monitoring thresholds

## Adding a New Data Source

### Step 1: Create the Data Fetcher

Create a new file `services/fetchers/<SourceName>DataFetcher.js` that implements `IDataFetcher` and maps to the standardized schema:

```javascript
const axios = require('axios');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

class MySourceDataFetcher extends IDataFetcher {
  constructor(healthMonitor = null) {
    super();
    this.healthMonitor = healthMonitor;
    this.config = ApiConfig.getApiConfig('mysource') || {};
    this.sourceId = 'mysource';
  }

  getSourceId() { return this.sourceId; }
  getSourceName() { return this.config?.name || 'MySource'; }
  isConfigured() { return !!this.config?.enabled; }
  getCapabilities() { return this.config?.capabilities || { priority: 5 }; }
  getRateLimitInfo() { return this.config?.rateLimit || {}; }
  async getHealthStatus() { return { healthy: true }; }

  async fetchStablecoins() {
    if (!this.isConfigured()) return [];
    const start = Date.now();
    try {
      const baseUrl = this.config?.baseUrl || 'https://api.example.com';
      const url = `${baseUrl}${this.config?.endpoints?.stablecoins || '/stablecoins'}`;
      const headers = { ...(this.config?.request?.headers || {}) };
      const timeout = this.config?.request?.timeout;
      const resp = await axios.get(url, { headers, timeout });
      const raw = Array.isArray(resp.data?.data) ? resp.data.data : (resp.data || []);
      if (this.healthMonitor) {
        await this.healthMonitor.recordSuccess(this.sourceId, {
          operation: 'fetchStablecoins', duration: Date.now() - start,
          recordCount: Array.isArray(raw) ? raw.length : 0, timestamp: Date.now()
        });
      }
      return raw;
    } catch (error) {
      if (this.healthMonitor) {
        await this.healthMonitor.recordFailure(this.sourceId, {
          operation: 'fetchStablecoins', message: error?.message,
          statusCode: error?.response?.status, retryable: true, timestamp: Date.now()
        });
      }
      throw error;
    }
  }

  transformToStandardFormat(rawData) {
    const ts = Date.now();
    return (rawData || []).map(item => ({
      sourceId: this.sourceId,
      id: item.id,
      name: item.name,
      symbol: item.symbol ? String(item.symbol).toUpperCase() : item.symbol,
      slug: (item.slug || item.symbol || item.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      marketData: {
        price: item.price ?? null,
        marketCap: item.market_cap ?? null,
        volume24h: item.volume_24h ?? null,
        percentChange24h: item.percent_change_24h ?? null,
        rank: item.rank ?? null,
      },
      supplyData: {
        circulating: item.circulating ?? null,
        total: item.total ?? null,
        max: item.max ?? null,
        networkBreakdown: Array.isArray(item.networks) ? item.networks.map(n => ({
          name: n.name || n.network,
          network: (n.network || n.name || null) ? String(n.network || n.name).toLowerCase() : null,
          contractAddress: n.contract || null,
          supply: n.supply ?? null,
          percentage: n.percentage ?? null,
        })) : [],
      },
      platforms: Array.isArray(item.networks) ? item.networks.map(n => ({
        name: n.name || n.network,
        network: (n.network || n.name || null) ? String(n.network || n.name).toLowerCase() : null,
        contractAddress: n.contract || null,
        supply: n.supply ?? null,
        percentage: n.percentage ?? null,
      })) : [],
      metadata: {
        tags: Array.isArray(item.tags) ? item.tags : [],
        description: item.description || null,
        website: item.website || null,
        logoUrl: item.logo || null,
        dateAdded: item.date_added || null,
      },
      confidence: 0.8,
      timestamp: ts,
    }));
  }
}

module.exports = MySourceDataFetcher;
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
            hasMarketData: true,
            hasSupplyData: false,
            hasPlatformData: false,
            hasNetworkBreakdown: false,
            hasMetadata: true,
            priority: 6, // Lower than CMC (10) but higher than others
            dataTypes: ['price', 'market_cap', 'volume', 'rank', 'tags']
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

Add the new fetcher to the default registry so it’s auto-constructed when enabled:

```javascript
// services/DataFetcherRegistry.js
const MySourceDataFetcher = require('./fetchers/MySourceDataFetcher');
// ... inside createDefault()
if (enabled.includes('mysource')) registry.register(new MySourceDataFetcher(healthMonitor));
```

Alternatively, you can manually register a fetcher on a custom registry instance.

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

Create tests for both raw fetching and transformation:

```javascript
describe('MySourceDataFetcher', () => {
    test('should fetch stablecoin data successfully', async () => {
        const fetcher = new MySourceDataFetcher(mockHealthMonitor);
        const data = await fetcher.fetchStablecoins();
        
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

### Consistency Checklist (required)
- `symbol` is uppercase
- `slug` is lowercase and URL-safe
- `network` fields are lowercase in both `platforms` and `supplyData.networkBreakdown`
- `platforms` mirror `networkBreakdown` when applicable
- `metadata` fields set when available; use null when missing
- `confidence` in [0,1]; `timestamp` set to `Date.now()`

See the canonical schema in `docs/standardized-stablecoin-format.md`.

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
