require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function testDifferentAssetPaths() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    console.log('Testing different asset API paths and approaches...\n');
    
    // Test different path variations
    const pathsToTest = [
        '/metrics/v2/assets',
        '/api/v2/assets', 
        '/v2/assets',
        '/assets',
        '/metrics/v1/assets',
        '/api/v1/assets'
    ];
    
    for (const path of pathsToTest) {
        try {
            console.log(`Testing: ${path}`);
            const response = await client.request({ 
                method: 'GET', 
                path,
                params: { limit: 10 }
            });
            const assets = Array.isArray(response?.data) ? response.data : response;
            console.log(`   ✓ Success: ${assets ? assets.length : 0} assets`);
            
            if (assets && assets.length > 0) {
                console.log(`     First few: ${assets.slice(0, 3).map(a => `${a.name}(${a.symbol})`).join(', ')}`);
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('ALTERNATIVE APPROACH: Check what SDK methods are available');
    console.log('='.repeat(60));
    
    // Try to explore SDK methods
    console.log('Available client properties:', Object.keys(client));
    
    if (client.asset) {
        console.log('client.asset methods:', Object.keys(client.asset));
        
        // Try SDK methods that might work
        try {
            console.log('\nTrying client.asset.getAssets()...');
            const sdkAssets = await client.asset.getAssets({ limit: 10 });
            console.log(`   ✓ SDK method result: ${sdkAssets?.data ? sdkAssets.data.length : 0} assets`);
        } catch (error) {
            console.log(`   ✗ SDK method error: ${error.message}`);
        }
    }
    
    // Test if we can get specific known stablecoins directly
    console.log('\n' + '='.repeat(60));
    console.log('DIRECT ASSET TESTS');
    console.log('='.repeat(60));
    
    const knownStablecoins = ['tether', 'usd-coin', 'dai', 'usdt', 'usdc'];
    
    for (const slug of knownStablecoins) {
        try {
            console.log(`Testing direct access to: ${slug}`);
            const assetData = await client.request({ 
                method: 'GET', 
                path: `/api/v1/assets/${slug}`,
            });
            console.log(`   ✓ Found: ${assetData?.name || assetData?.data?.name || 'Unknown name'}`);
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
    }
}

testDifferentAssetPaths();