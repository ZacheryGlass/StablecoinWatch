require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function checkAllAssets() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    try {
        console.log('1. Dedicated stablecoins endpoint:');
        const stablecoinData = await client.request({ method: 'GET', path: '/metrics/v2/stablecoins' });
        const stablecoinList = Array.isArray(stablecoinData?.data) ? stablecoinData.data : stablecoinData;
        console.log(`   Count: ${stablecoinList ? stablecoinList.length : 0}`);
        
        console.log('\n2. Testing direct asset API call:');
        // Try the direct v2 assets endpoint as mentioned in SCWv2.txt
        try {
            const assetsResponse = await client.request({ 
                method: 'GET', 
                path: '/api/v2/assets',
                params: { limit: 500 }
            });
            
            const allAssets = Array.isArray(assetsResponse?.data) ? assetsResponse.data : assetsResponse;
            console.log(`   Total assets: ${allAssets ? allAssets.length : 0}`);
            
            if (allAssets && allAssets.length > 0) {
                // Look for stablecoins by sector or category
                const stablecoinsFromAll = allAssets.filter(asset => {
                    const sector = (asset.profile?.sector || '').toLowerCase();
                    const category = (asset.category || '').toLowerCase();
                    const name = (asset.name || '').toLowerCase();
                    const symbol = (asset.symbol || '').toLowerCase();
                    
                    return sector === 'stablecoins' ||
                           category.includes('stable') ||
                           name.includes('stable') ||
                           name.includes('usd') ||
                           symbol.includes('usd');
                });
                
                console.log(`   Potential stablecoins by filtering: ${stablecoinsFromAll.length}`);
                
                // Check sector distribution
                const sectorCounts = {};
                allAssets.forEach(asset => {
                    const sector = asset.profile?.sector || 'Unknown';
                    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
                });
                
                console.log('\n   Top sectors:');
                Object.entries(sectorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .forEach(([sector, count]) => {
                        console.log(`     ${sector}: ${count}`);
                    });
            }
            
        } catch (apiError) {
            console.log(`   API Error: ${apiError.message}`);
            
            // Try alternative path
            console.log('\n3. Trying alternative v1 assets endpoint:');
            try {
                const v1Response = await client.request({ 
                    method: 'GET', 
                    path: '/api/v1/assets',
                    params: { limit: 500 }
                });
                
                const v1Assets = Array.isArray(v1Response?.data) ? v1Response.data : v1Response;
                console.log(`   V1 assets count: ${v1Assets ? v1Assets.length : 0}`);
            } catch (v1Error) {
                console.log(`   V1 API Error: ${v1Error.message}`);
            }
        }
        
    } catch (error) {
        console.error('Main error:', error.message);
    }
}

checkAllAssets();