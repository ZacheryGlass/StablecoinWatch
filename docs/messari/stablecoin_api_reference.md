# Messari Stablecoin API Documentation

This document provides a comprehensive overview of the Messari Stablecoin Metrics API, which is a foundational set of APIs for interacting with stablecoins supported by Messari. All endpoints are currently in beta. Messari sources stablecoin data from Token Terminal.

## API Endpoints

The Stablecoin Metrics API consists of three main endpoints:

### 1. List Stablecoins

This endpoint returns a complete list of all available stablecoins supported by Messari, along with their coverage data.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/stablecoins
```

**Node.js Example:**
```javascript
const fetch = require('node-fetch');

const url = 'https://api.messari.io/metrics/v2/stablecoins';
const options = {
  method: 'GET',
  headers: {
    'x-messari-api-key': 'YOUR_API_KEY'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
```

**Javascript Example:**
```javascript
const url = 'https://api.messari.io/metrics/v2/stablecoins';
const options = {
  method: 'GET',
  headers: {
    'x-messari-api-key': 'YOUR_API_KEY'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
```

### 2. List Stablecoin Metrics

This endpoint returns a list of all available timeseries metrics for stablecoins.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/stablecoins/metrics
```

**Node.js Example:**
```javascript
const fetch = require('node-fetch');

const url = 'https://api.messari.io/metrics/v2/stablecoins/metrics';
const options = {
  method: 'GET',
  headers: {
    'x-messari-api-key': 'YOUR_API_KEY'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
```

**Javascript Example:**
```javascript
const url = 'https://api.messari.io/metrics/v2/stablecoins/metrics';
const options = {
  method: 'GET',
  headers: {
    'x-messari-api-key': 'YOUR_API_KEY'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
```

### 3. Stablecoin Timeseries Metric

This endpoint returns data points for a chosen timeseries metric set, which can be either core or a breakdown by network. It is typically used for exporting complete data series or for graphical visualizations.

**Endpoint:**
```
GET https://api.messari.io/metrics/v2/stablecoins/{stablecoinIdentifier}/metrics/{metricGroup}/time-series/{granularity}
```

**Node.js Example:**
```javascript
const fetch = require('node-fetch');

const url = 'https://api.messari.io/metrics/v2/stablecoins/usdt/metrics/circulating-supply/time-series/1d';
const options = {
  method: 'GET',
  headers: {
    'x-messari-api-key': 'YOUR_API_KEY'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
```

**Javascript Example:**
```javascript
const url = 'https://api.messari.io/metrics/v2/stablecoins/usdt/metrics/circulating-supply/time-series/1d';
const options = {
  method: 'GET',
  headers: {
    'x-messari-api-key': 'YOUR_API_KEY'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
```

---

### Important Notices

Your use of this API is subject to and governed by Messari's [Terms of Use](https://messari.s3.amazonaws.com/termsofuse.html) and [Privacy Policy](https://messari.s3.amazonaws.com/privacy.html). By accessing and using this API, you agree to comply with the terms and conditions outlined in these documents.

The Messari API is intended for internal purposes and uses only. If you are interested in redistributing any data from the API, please contact [[email protected]](/cdn-cgi/l/email-protection#b3c0d2dfd6c0f3ded6c0c0d2c1da9ddadc). Messari reserves the right to modify, update, or revise the API Documentation at any time without notice.