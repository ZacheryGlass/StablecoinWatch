require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function compareEndpoints() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    try {
        console.log('1. /metrics/v2/stablecoins endpoint:');
        const stablecoinData = await client.request({ method: 'GET', path: '/metrics/v2/stablecoins' });
        const stablecoinList = Array.isArray(stablecoinData?.data) ? stablecoinData.data : stablecoinData;
        console.log(`   Dedicated stablecoins endpoint: ${stablecoinList ? stablecoinList.length : 0} stablecoins`);
        
        console.log('\n2. Using SDK getAllAssets method:');
        const allAssetsResponse = await client.assets.all({ limit: 500 });
        const allAssets = allAssetsResponse?.data || [];
        console.log(`   Total assets from assets.all(): ${allAssets.length}`);
        
        // Filter for potential stablecoins
        if (allAssets.length > 0) {
            const usdCoins = allAssets.filter(asset => {
                const name = (asset.name || '').toLowerCase();
                const symbol = (asset.symbol || '').toLowerCase();
                
                return name.includes('usd') || 
                       name.includes('stable') || 
                       name.includes('tether') ||
                       symbol.includes('usd') ||
                       (symbol.length >= 3 && symbol.includes('usd'));
            });
            
            console.log(`   Assets with 'USD' or 'stable' keywords: ${usdCoins.length}`);
            
            console.log('\n   Sample USD-related assets:');
            usdCoins.slice(0, 15).forEach((asset, i) => {
                console.log(`   ${i+1}. ${asset.name} (${asset.symbol})`);
            });
            
            // Check if the dedicated endpoint coins are in the general list
            if (stablecoinList) {
                const dedicatedSlugs = stablecoinList.map(s => s.slug || s.id);
                const foundInGeneral = dedicatedSlugs.filter(slug => 
                    allAssets.some(asset => asset.slug === slug || asset.id === slug)
                );
                console.log(`\n3. Overlap analysis:`);
                console.log(`   Dedicated stablecoins found in general assets: ${foundInGeneral.length}/${dedicatedSlugs.length}`);
                
                const notInGeneral = dedicatedSlugs.filter(slug => 
                    !allAssets.some(asset => asset.slug === slug || asset.id === slug)
                );
                if (notInGeneral.length > 0) {
                    console.log(`   Stablecoins NOT in general assets: ${notInGeneral.join(', ')}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

compareEndpoints();