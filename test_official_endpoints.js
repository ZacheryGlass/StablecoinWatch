require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function testOfficialEndpoints() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    try {
        console.log('Testing all official stablecoin API endpoints from the documentation:\n');
        
        // 1. List Stablecoins
        console.log('1. GET /metrics/v2/stablecoins');
        console.log('   (Returns list of all available stablecoins with coverage data)');
        try {
            const stablecoinsData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/stablecoins' 
            });
            const stablecoinsList = Array.isArray(stablecoinsData?.data) ? stablecoinsData.data : stablecoinsData;
            console.log(`   ✓ Count: ${stablecoinsList ? stablecoinsList.length : 0} stablecoins`);
            
            if (stablecoinsList && stablecoinsList.length > 0) {
                console.log(`   Sample response structure:`, Object.keys(stablecoinsList[0]));
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        
        // 2. List Stablecoin Metrics
        console.log('\n2. GET /metrics/v2/stablecoins/metrics');
        console.log('   (Returns list of all available timeseries metrics for stablecoins)');
        try {
            const metricsData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/stablecoins/metrics' 
            });
            const metricsList = Array.isArray(metricsData?.data) ? metricsData.data : metricsData;
            console.log(`   ✓ Available metrics: ${metricsList ? metricsList.length : 0}`);
            
            if (metricsList && metricsList.length > 0) {
                console.log(`   First few metrics:`, metricsList.slice(0, 5));
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        
        // 3. Test individual stablecoin timeseries (using USDT as example)
        console.log('\n3. GET /metrics/v2/stablecoins/{stablecoinIdentifier}/metrics/{metricGroup}/time-series/{granularity}');
        console.log('   (Testing with USDT circulating supply daily data)');
        try {
            const timeseriesData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/stablecoins/usdt/metrics/circulating-supply/time-series/1d' 
            });
            
            const timeseriesList = Array.isArray(timeseriesData?.data) ? timeseriesData.data : timeseriesData;
            console.log(`   ✓ USDT daily circulating supply data points: ${timeseriesList ? timeseriesList.length : 0}`);
            
            if (timeseriesList && timeseriesList.length > 0) {
                const latest = timeseriesList[timeseriesList.length - 1];
                console.log(`   Latest data point:`, latest);
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        
        // 4. Try some variations to see if there are more stablecoins available
        console.log('\n4. Testing endpoint variations:');
        
        // Try with query parameters
        console.log('\n   4a. Testing /metrics/v2/stablecoins with limit parameter');
        try {
            const limitedData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/stablecoins',
                params: { limit: 100 }
            });
            const limitedList = Array.isArray(limitedData?.data) ? limitedData.data : limitedData;
            console.log(`   ✓ With limit=100: ${limitedList ? limitedList.length : 0} stablecoins`);
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        
        // Try different base URLs mentioned in docs
        console.log('\n   4b. Testing alternative base URL pattern');
        try {
            const altData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/stablecoins',
                baseURL: 'https://data.messari.io/api'
            });
            const altList = Array.isArray(altData?.data) ? altData.data : altData;
            console.log(`   ✓ Alternative base URL: ${altList ? altList.length : 0} stablecoins`);
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        
    } catch (error) {
        console.error('Main error:', error.message);
    }
}

testOfficialEndpoints();