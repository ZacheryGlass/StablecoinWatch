require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

// Helper function to add delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function investigateAdditionalStablecoins() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    console.log('='.repeat(80));
    console.log('INVESTIGATING ADDITIONAL STABLECOINS VIA ASSET API');
    console.log('='.repeat(80));
    
    try {
        // 1. Get baseline - the 27 stablecoins from dedicated endpoint
        console.log('\n1. BASELINE: Getting stablecoins from dedicated endpoint...');
        await sleep(1000); // Add small delay
        const dedicatedData = await client.request({ method: 'GET', path: '/metrics/v2/stablecoins' });
        const dedicatedStablecoins = Array.isArray(dedicatedData?.data) ? dedicatedData.data : dedicatedData;
        const dedicatedSlugs = new Set(dedicatedStablecoins.map(s => s.slug));
        const dedicatedSymbols = new Set(dedicatedStablecoins.map(s => s.symbol));
        
        console.log(`   ✓ Found ${dedicatedStablecoins.length} stablecoins in dedicated endpoint`);
        console.log(`   Slugs: ${Array.from(dedicatedSlugs).slice(0, 10).join(', ')}...`);
        console.log(`   Symbols: ${Array.from(dedicatedSymbols).slice(0, 10).join(', ')}...`);
        
        // 2. Test asset API endpoint with different approaches
        console.log('\n2. TESTING ASSET API APPROACHES...');
        
        const assetDiscoveries = [];
        
        // 2a. Try direct client.request to /metrics/v2/assets 
        console.log('\n   2a. Testing /metrics/v2/assets endpoint...');
        try {
            const assetsData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/assets',
                params: { limit: 500 }
            });
            
            const allAssets = Array.isArray(assetsData?.data) ? assetsData.data : assetsData;
            console.log(`   ✓ Retrieved ${allAssets ? allAssets.length : 0} total assets`);
            
            if (allAssets && allAssets.length > 0) {
                console.log(`   Sample asset structure:`, Object.keys(allAssets[0]));
                
                // Check sectors
                const sectorCounts = {};
                allAssets.forEach(asset => {
                    const sector = asset.sector || 'Unknown';
                    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
                });
                
                console.log(`\n   Top 10 sectors found:`);
                Object.entries(sectorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .forEach(([sector, count]) => {
                        console.log(`     ${sector}: ${count} assets`);
                    });
                
                // Look for "Stablecoins" sector specifically
                const stablecoinSector = allAssets.filter(asset => 
                    (asset.sector || '').toLowerCase().includes('stable')
                );
                console.log(`\n   Assets with 'stable' in sector: ${stablecoinSector.length}`);
                
                if (stablecoinSector.length > 0) {
                    console.log('   Stablecoin sector assets:');
                    stablecoinSector.slice(0, 10).forEach(asset => {
                        console.log(`     ${asset.name} (${asset.symbol}) - Sector: ${asset.sector}`);
                    });
                    assetDiscoveries.push(...stablecoinSector);
                }
                
                // Keyword-based search
                const keywordMatches = allAssets.filter(asset => {
                    const name = (asset.name || '').toLowerCase();
                    const symbol = (asset.symbol || '').toLowerCase();
                    const category = (asset.category || '').toLowerCase();
                    
                    return name.includes('usd') || 
                           name.includes('stable') || 
                           name.includes('tether') ||
                           name.includes('dollar') ||
                           symbol.includes('usd') ||
                           category.includes('stable');
                });
                
                console.log(`\n   Assets matching stablecoin keywords: ${keywordMatches.length}`);
                if (keywordMatches.length > 0) {
                    console.log('   Keyword matches (first 15):');
                    keywordMatches.slice(0, 15).forEach((asset, i) => {
                        console.log(`     ${i+1}. ${asset.name} (${asset.symbol}) - ${asset.sector || 'No sector'}`);
                    });
                    assetDiscoveries.push(...keywordMatches);
                }
                
            }
        } catch (error) {
            console.log(`   ✗ Asset API Error: ${error.message}`);
        }
        
        // 2b. Try with specific sector filter
        console.log('\n   2b. Testing with sector=Stablecoins filter...');
        try {
            const sectorData = await client.request({ 
                method: 'GET', 
                path: '/metrics/v2/assets',
                params: { 
                    limit: 200,
                    sector: 'Stablecoins'
                }
            });
            
            const sectorAssets = Array.isArray(sectorData?.data) ? sectorData.data : sectorData;
            console.log(`   ✓ Found ${sectorAssets ? sectorAssets.length : 0} assets with sector=Stablecoins`);
            
            if (sectorAssets && sectorAssets.length > 0) {
                console.log('   Sector-filtered stablecoins:');
                sectorAssets.slice(0, 10).forEach(asset => {
                    console.log(`     ${asset.name} (${asset.symbol})`);
                });
                assetDiscoveries.push(...sectorAssets);
            }
        } catch (error) {
            console.log(`   ✗ Sector filter error: ${error.message}`);
        }
        
        // 3. Cross-reference analysis
        console.log('\n3. CROSS-REFERENCE ANALYSIS...');
        
        // Remove duplicates from discoveries
        const uniqueDiscoveries = new Map();
        assetDiscoveries.forEach(asset => {
            uniqueDiscoveries.set(asset.slug || asset.id, asset);
        });
        
        const discoveredAssets = Array.from(uniqueDiscoveries.values());
        console.log(`   Total unique assets discovered: ${discoveredAssets.length}`);
        
        // Find assets NOT in the dedicated stablecoin endpoint
        const newStablecoins = discoveredAssets.filter(asset => 
            !dedicatedSlugs.has(asset.slug) && !dedicatedSymbols.has(asset.symbol)
        );
        
        console.log(`   New stablecoins NOT in dedicated endpoint: ${newStablecoins.length}`);
        
        if (newStablecoins.length > 0) {
            console.log('\n   🎯 POTENTIAL ADDITIONAL STABLECOINS:');
            newStablecoins.slice(0, 20).forEach((asset, i) => {
                console.log(`   ${i+1}. ${asset.name} (${asset.symbol}) - ${asset.sector || 'No sector'}`);
                console.log(`      Slug: ${asset.slug}, Category: ${asset.category || 'N/A'}`);
            });
        }
        
        // Find overlap
        const overlap = discoveredAssets.filter(asset => 
            dedicatedSlugs.has(asset.slug) || dedicatedSymbols.has(asset.symbol)
        );
        
        console.log(`   Overlap with dedicated endpoint: ${overlap.length}/${dedicatedStablecoins.length}`);
        
        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('SUMMARY');
        console.log('='.repeat(80));
        console.log(`Dedicated stablecoin endpoint: ${dedicatedStablecoins.length} stablecoins`);
        console.log(`Asset API discoveries: ${discoveredAssets.length} potential stablecoins`);
        console.log(`New stablecoins found: ${newStablecoins.length}`);
        console.log(`Overlap: ${overlap.length}`);
        
        if (newStablecoins.length > 0) {
            console.log(`\n🚀 RECOMMENDATION: Asset API found ${newStablecoins.length} additional potential stablecoins!`);
            console.log('   Consider implementing hybrid approach for expanded coverage.');
        } else {
            console.log(`\n📋 RECOMMENDATION: Dedicated endpoint appears comprehensive.`);
            console.log('   Asset API does not reveal additional high-confidence stablecoins.');
        }
        
    } catch (error) {
        console.error('Investigation error:', error.message);
    }
}

investigateAdditionalStablecoins();