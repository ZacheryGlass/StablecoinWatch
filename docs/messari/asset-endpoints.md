# Messari Assets API Documentation

This document provides a comprehensive overview of the Messari Assets Metrics API, which is a foundational set of APIs for interacting with assets supported by Messari. All endpoints are currently in beta.

## API Endpoints

The Assets Metrics API consists of six main endpoints:

### 1. List Assets

This endpoint returns a complete list of all available assets that match the filter criteria, along with their coverage data. Filters include category, sector, and tags, and it also supports fuzzy search.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/assets```

**Javascript Example:**
```javascript
import messari from '@api/messari';

messari.metricsAssetsListAssets({
  hasDiligence: 'true',
  hasIntel: 'true',
  hasMarketData: 'true',
  hasNews: 'true',
  limit: '10'
})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));```

**Example Response:**
```json
{
  "error": null,
  "data": [
    {
      "id": "1e31218a-e44e-4285-820c-8282ee222035",
      "name": "Bitcoin",
      "slug": "bitcoin",
      "symbol": "BTC",
      "category": "Cryptocurrency",
      "sector": "Cryptocurrency",
      "tags": [
        "Proof-of-Work"
      ],
      "rank": 1,
      "has_diligence": true,
      "has_intel": true,
      "has_market_data": true,
      "has_news": true,
      "has_proposals": false,
      "has_research": true,
      "has_token_unlocks": false,
      "has_fundraising": false
    },
    {
      "id": "21c795f5-1bfd-40c3-858e-e9d7e820c6d0",
      "name": "Ethereum",
      "slug": "ethereum",
      "symbol": "ETH",
      "category": "Networks",
      "sector": "Smart Contract Platform",
      "tags": [
        "EVM",
        "Proof-of-Stake",
        "Stakeable"
      ],
      "rank": 2,
      "has_diligence": true,
      "has_intel": true,
      "has_market_data": true,
      "has_news": true,
      "has_proposals": false,
      "has_research": true,
      "has_token_unlocks": false,
      "has_fundraising": false
    }
  ]
}
```

### 2. Get Asset Details

This endpoint returns detailed information for up to 20 assets specified by their IDs or slugs. The details include market data, qualitative information, supply data, all-time high, and return on investment, among others.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/assets/details
```

**Javascript Example:**
```javascript
import messari from '@api/messari';

messari.metricsAssetsGetAssetDetails({slugs: 'bitcoin%2Cethereum'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));
```

**Example Response:**
```json
{
  "error": null,
  "data": [
    {
      "id": "1e31218a-e44e-4285-820c-8282ee222035",
      "name": "Bitcoin",
      "slug": "bitcoin",
      "symbol": "BTC",
      "rank": 1,
      "category": "Cryptocurrency",
      "sector": "Cryptocurrency",
      "marketData": {
        "priceUsd": 83418.62702064135,
        "supply": {
          "circulating": 19838271
        },
        "marketcap": {
          "circulatingUsd": 1649663857504
        }
      },
      "returnOnInvestment": {
        "priceChange24h": -0.12630068404746395,
        "priceChange7d": 2.7747116740983273
      },
      "allTimeHigh": {
        "allTimeHigh": 109100.29566458709,
        "allTimeHighDate": "2025-01-20T06:00:00Z"
      }
    },
    {
      "id": "21c795f5-1bfd-40c3-858e-e9d7e820c6d0",
      "name": "Ethereum",
      "slug": "ethereum",
      "symbol": "ETH",
      "rank": 2,
      "category": "Networks",
      "sector": "Smart Contract Platform",
      "marketData": {
        "priceUsd": 1911.015664720327,
        "supply": {
          "circulating": 120621681.62
        },
        "marketcap": {
          "circulatingUsd": 229785651800
        }
      },
      "returnOnInvestment": {
        "priceChange24h": 0.39337131824731686,
        "priceChange7d": 0.17450394193682
      },
      "allTimeHigh": {
        "allTimeHigh": 4864.732372655,
        "allTimeHighDate": "2021-11-10T14:00:00Z"
      }
    }
  ]
}
```

### 3. List Metrics

This endpoint returns a list of all available market data and derivatives timeseries metrics for assets, along with their supported granularity.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/assets/metrics
```

**Javascript Example:**
```javascript
import messari from '@api/messari';

messari.metricsAssetsListMetrics()
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));
```

**Example Response:**
```json
{
  "error": null,
  "data": {
    "datasets": [
      {
        "slug": "price",
        "granularities": [
          "1h",
          "1d",
          "1w"
        ],
        "metrics": [
          {
            "name": "Timestamp",
            "slug": "time"
          },
          {
            "name": "Open Price",
            "slug": "open"
          },
          {
            "name": "High Price",
            "slug": "high"
          },
          {
            "name": "Low Price",
            "slug": "low"
          },
          {
            "name": "Close Price",
            "slug": "close"
          },
          {
            "name": "Volume",
            "slug": "volume"
          }
        ]
      }
    ]
  }
}
```

### 4. Asset Timeseries Metric

This endpoint returns data points for a chosen timeseries metric for a specific asset. The API supports a maximum of 5000 data points per request.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/assets/{assetSlug}/metrics/{metricGroup}/time-series/{granularity}
```

**Javascript Example:**
```javascript
import messari from '@api/messari';

messari.metricsAssetsAssetTimeseriesMetric({
  start: '2025-01-01T00%3A00%3A00Z',
  end: '2025-01-02T00%3A00%3A00Z',
  assetSlug: 'bitcoin',
  metricGroup: 'price',
  granularity: '1d'
})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));
```

**Example Response:**
```json
{
  "error": null,
  "data": {
    "points": [
      [
        1735689600,
        93390.10249380038,
        94944.36655871246,
        92823.27427758025,
        94392.70949576062,
        14203475459.832247
      ]
    ]
  },
  "metadata": {
    "pointSchemas": [
      { "slug": "time" },
      { "slug": "open" },
      { "slug": "high" },
      { "slug": "low" },
      { "slug": "close" },
      { "slug": "volume" }
    ],
    "granularity": "1d"
  }
}
```

### 5. Get ROIs

This endpoint returns the Return-on-Investment (ROI) data for specified assets. It also supports filtering by sector, category, and tag.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/assets/roi
```

**Javascript Example:**
```javascript
import messari from '@api/messari';

messari.metricsAssetsGetRois({slugs: 'bitcoin%2Cethereum', limit: '20'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));
```

**Example Response:**
```json
{
  "error": null,
  "data": [
    {
      "id": "1e31218a-e44e-4285-820c-8282ee222035",
      "name": "Bitcoin",
      "slug": "bitcoin",
      "symbol": "BTC",
      "returnOnInvestment": {
        "priceChange24h": 0.24334394850368413,
        "priceChange7d": 0.9588618347122231,
        "priceChange30d": -13.168077682177422,
        "priceChange1y": 31.608562424855098
      }
    },
    {
      "id": "21c795f5-1bfd-40c3-858e-e9d7e820c6d0",
      "name": "Ethereum",
      "slug": "ethereum",
      "symbol": "ETH",
      "returnOnInvestment": {
        "priceChange24h": 1.7524577264684555,
        "priceChange7d": 0.6933587545182244,
        "priceChange30d": -28.44782169639665,
        "priceChange1y": -40.05987184590123
      }
    }
  ]
}
```

### 6. Get ATHs

This endpoint returns the all-time high (ATH) data for specified assets and can be filtered by sector, category, or tag.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/assets/ath
```

**Javascript Example:**
```javascript
import messari from '@api/messari';

messari.metricsAssetsGetAths({slugs: 'bitcoin%2Cethereum', limit: '20'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));
```

**Example Response:**
```json
{
  "error": null,
  "data": [
    {
      "id": "1e31218a-e44e-4285-820c-8282ee222035",
      "name": "Bitcoin",
      "slug": "bitcoin",
      "symbol": "BTC",
      "allTimeHigh": {
        "allTimeHigh": 109100.29566458709,
        "allTimeHighDate": "2025-01-20T06:00:00Z",
        "allTimeHighPercentDown": 23.474240156
      }
    },
    {
      "id": "21c795f5-1bfd-40c3-858e-e9d7e820c6d0",
      "name": "Ethereum",
      "slug": "ethereum",
      "symbol": "ETH",
      "allTimeHigh": {
        "allTimeHigh": 4864.732372655,
        "allTimeHighDate": "2021-11-10T14:00:00Z",
        "allTimeHighPercentDown": 60.077944084
      }
    }
  ]
}
```
