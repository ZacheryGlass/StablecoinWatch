require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function testAssetsEndpoint() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    try {
        console.log('1. Testing /metrics/v2/stablecoins endpoint:');
        const stablecoinData = await client.request({ method: 'GET', path: '/metrics/v2/stablecoins' });
        const stablecoinList = Array.isArray(stablecoinData?.data) ? stablecoinData.data : stablecoinData;
        console.log(`   Count: ${stablecoinList ? stablecoinList.length : 0}`);
        
        console.log('\n2. Testing /api/v2/assets endpoint with pagination:');
        const assetsData = await client.request({ 
            method: 'GET', 
            path: '/api/v2/assets?limit=500' 
        });
        const assetsList = Array.isArray(assetsData?.data) ? assetsData.data : assetsData;
        console.log(`   Total assets returned: ${assetsList ? assetsList.length : 0}`);
        
        // Try to filter for stablecoins manually
        if (assetsList && assetsList.length > 0) {
            const potentialStablecoins = assetsList.filter(asset => {
                const name = (asset.name || '').toLowerCase();
                const symbol = (asset.symbol || '').toLowerCase();
                const category = (asset.category || '').toLowerCase();
                
                return name.includes('usd') || 
                       name.includes('stable') || 
                       name.includes('tether') ||
                       symbol.includes('usd') ||
                       category.includes('stable');
            });
            console.log(`   Potential stablecoins found by keyword: ${potentialStablecoins.length}`);
            
            if (potentialStablecoins.length > 0) {
                console.log('\n   First 10 potential stablecoins:');
                potentialStablecoins.slice(0, 10).forEach((coin, index) => {
                    console.log(`   ${index + 1}. ${coin.name} (${coin.symbol}) - Category: ${coin.category || 'N/A'}`);
                });
            }
        }
        
        console.log('\n3. Checking if there are category filters available:');
        console.log('   Structure of first asset:');
        if (assetsList && assetsList[0]) {
            console.log(`   Keys: ${Object.keys(assetsList[0]).join(', ')}`);
            if (assetsList[0].profile) {
                console.log(`   Profile keys: ${Object.keys(assetsList[0].profile).join(', ')}`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAssetsEndpoint();