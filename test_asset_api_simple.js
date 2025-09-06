require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function testAssetApiSimple() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    console.log('Testing Asset API endpoints...\n');
    
    try {
        // Test 1: Basic assets endpoint without params
        console.log('1. Testing /metrics/v2/assets (no params)...');
        const basic = await client.request({ method: 'GET', path: '/metrics/v2/assets' });
        const basicAssets = Array.isArray(basic?.data) ? basic.data : basic;
        console.log(`   Result: ${basicAssets ? basicAssets.length : 0} assets`);
        
        if (basicAssets && basicAssets.length > 0) {
            console.log(`   First asset: ${basicAssets[0].name} (${basicAssets[0].symbol}) - ${basicAssets[0].sector}`);
        }
        
        // Test 2: With higher limit
        console.log('\n2. Testing /metrics/v2/assets?limit=100...');
        const withLimit = await client.request({ 
            method: 'GET', 
            path: '/metrics/v2/assets',
            params: { limit: 100 }
        });
        const limitedAssets = Array.isArray(withLimit?.data) ? withLimit.data : withLimit;
        console.log(`   Result: ${limitedAssets ? limitedAssets.length : 0} assets`);
        
        if (limitedAssets && limitedAssets.length > 0) {
            console.log(`   Sample assets:`);
            limitedAssets.slice(0, 5).forEach(asset => {
                console.log(`     ${asset.name} (${asset.symbol}) - ${asset.sector}`);
            });
        }
        
        // Test 3: Check if the endpoint requires different parameters
        console.log('\n3. Testing different parameter combinations...');
        
        const paramTests = [
            { hasMarketData: 'true' },
            { limit: 50 },
            { limit: 20, hasMarketData: 'true' }
        ];
        
        for (let i = 0; i < paramTests.length; i++) {
            const params = paramTests[i];
            try {
                console.log(`   Test 3.${i+1}: params = ${JSON.stringify(params)}`);
                const test = await client.request({ 
                    method: 'GET', 
                    path: '/metrics/v2/assets',
                    params
                });
                const testAssets = Array.isArray(test?.data) ? test.data : test;
                console.log(`     ✓ Result: ${testAssets ? testAssets.length : 0} assets`);
            } catch (error) {
                console.log(`     ✗ Error: ${error.message}`);
            }
        }
        
        // Test 4: Check if we can access the asset details endpoint
        console.log('\n4. Testing asset details endpoint...');
        try {
            // Try to get details for some known stablecoins
            const details = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/assets/details',
                params: { slugs: 'tether,usdc,dai' }
            });
            const detailsData = Array.isArray(details?.data) ? details.data : details;
            console.log(`   ✓ Asset details: ${detailsData ? detailsData.length : 0} assets`);
            
            if (detailsData && detailsData.length > 0) {
                console.log(`   Details for: ${detailsData.map(a => a.name).join(', ')}`);
            }
        } catch (error) {
            console.log(`   ✗ Asset details error: ${error.message}`);
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
        console.error('Full error:', error);
    }
}

testAssetApiSimple();