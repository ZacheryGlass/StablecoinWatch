require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function testSdkMethods() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    console.log('Testing available SDK methods...\n');
    
    const methodsToTest = [
        'getAssetsV2',
        'getAssetDetails', 
        'getAssetsTimeseriesCatalog',
        'getAssetsV2ATH',
        'getAssetsV2ROI'
    ];
    
    for (const methodName of methodsToTest) {
        try {
            console.log(`Testing client.asset.${methodName}()...`);
            
            let result;
            if (methodName === 'getAssetDetails') {
                // This method might need slugs parameter
                result = await client.asset[methodName]({ slugs: 'bitcoin,ethereum' });
            } else if (methodName === 'getAssetsV2') {
                // This might be the main assets list method
                result = await client.asset[methodName]({ limit: 100 });
            } else {
                // Try with basic parameters
                result = await client.asset[methodName]({ limit: 10 });
            }
            
            const data = result?.data || result;
            console.log(`   ✓ Success: ${Array.isArray(data) ? data.length : 'single item'} result(s)`);
            
            if (Array.isArray(data) && data.length > 0) {
                console.log(`     First few items:`);
                data.slice(0, 3).forEach(item => {
                    const name = item.name || item.slug || 'Unknown';
                    const symbol = item.symbol || 'N/A';
                    const sector = item.sector || 'N/A';
                    console.log(`       ${name} (${symbol}) - ${sector}`);
                });
            } else if (data && typeof data === 'object') {
                console.log(`     Single result keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
            }
            
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
    }
    
    // Try more parameter variations for getAssetsV2
    console.log('\n' + '='.repeat(60));
    console.log('DETAILED getAssetsV2 testing with different parameters');
    console.log('='.repeat(60));
    
    const paramVariations = [
        {},
        { limit: 500 },
        { hasMarketData: true },
        { sector: 'Cryptocurrency' },
        { category: 'Cryptocurrency' },
        // Try some potential stablecoin sectors/categories
        { sector: 'Stablecoins' },
        { sector: 'Currency' },
        { category: 'Stablecoin' }
    ];
    
    for (let i = 0; i < paramVariations.length; i++) {
        const params = paramVariations[i];
        try {
            console.log(`\nTest ${i+1}: getAssetsV2(${JSON.stringify(params)})`);
            const result = await client.asset.getAssetsV2(params);
            const assets = result?.data || result;
            
            if (Array.isArray(assets)) {
                console.log(`   ✓ Found ${assets.length} assets`);
                
                if (assets.length > 0) {
                    // Look for stablecoins
                    const potentialStablecoins = assets.filter(asset => {
                        const name = (asset.name || '').toLowerCase();
                        const symbol = (asset.symbol || '').toLowerCase(); 
                        const sector = (asset.sector || '').toLowerCase();
                        
                        return name.includes('usd') || 
                               name.includes('stable') || 
                               symbol.includes('usd') || 
                               sector.includes('stable');
                    });
                    
                    console.log(`   Potential stablecoins: ${potentialStablecoins.length}`);
                    if (potentialStablecoins.length > 0) {
                        console.log('   🎯 Stablecoin candidates:');
                        potentialStablecoins.slice(0, 10).forEach(coin => {
                            console.log(`     ${coin.name} (${coin.symbol}) - ${coin.sector}`);
                        });
                    }
                    
                    // Show sector distribution
                    if (assets.length <= 50) {
                        const sectors = {};
                        assets.forEach(asset => {
                            const sector = asset.sector || 'Unknown';
                            sectors[sector] = (sectors[sector] || 0) + 1;
                        });
                        console.log(`   Sectors found: ${Object.entries(sectors).map(([s,c]) => `${s}(${c})`).join(', ')}`);
                    }
                }
            } else {
                console.log(`   ✓ Single result: ${JSON.stringify(assets).substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
    }
}

testSdkMethods();