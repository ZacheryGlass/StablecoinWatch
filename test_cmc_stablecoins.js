require('dotenv').config();
const axios = require('axios');

async function testCmcStablecoins() {
    const apiKey = process.env.CMC_API_KEY;
    
    if (!apiKey) {
        console.error('CMC_API_KEY not found in .env file');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('TESTING COINMARKETCAP API FOR STABLECOINS');
    console.log('='.repeat(80));

    try {
        console.log('Fetching cryptocurrency data from CoinMarketCap...');
        
        const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
        const headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': apiKey,
        };
        
        const parameters = {
            start: '1',
            limit: '5000', // Maximum allowed per request
            aux: 'tags'
        };

        const response = await axios.get(url, { headers, params: parameters });
        const data = response.data;

        console.log(`✓ Retrieved ${data.data ? data.data.length : 0} cryptocurrencies`);
        
        if (!data.data) {
            console.error('No data received from CoinMarketCap API');
            return;
        }

        // Filter for stablecoins by tag
        const stablecoinsByTag = data.data.filter(crypto => {
            return crypto.tags && crypto.tags.includes('stablecoin');
        });

        console.log(`🎯 Stablecoins found by 'stablecoin' tag: ${stablecoinsByTag.length}`);

        if (stablecoinsByTag.length > 0) {
            console.log('\nStablecoins found by tag:');
            stablecoinsByTag.forEach((coin, index) => {
                const price = coin.quote?.USD?.price || 'N/A';
                const marketCap = coin.quote?.USD?.market_cap || 'N/A';
                console.log(`${index + 1}. ${coin.name} (${coin.symbol}) - Price: $${typeof price === 'number' ? price.toFixed(4) : price}, MCap: ${typeof marketCap === 'number' ? '$' + marketCap.toLocaleString() : marketCap}`);
            });
        }

        // Also try keyword-based detection for comparison
        const keywordStablecoins = data.data.filter(crypto => {
            const name = (crypto.name || '').toLowerCase();
            const symbol = (crypto.symbol || '').toLowerCase();
            
            return name.includes('usd') || 
                   name.includes('stable') || 
                   name.includes('tether') ||
                   name.includes('dollar') ||
                   symbol.includes('usd') ||
                   (symbol.length >= 4 && symbol.includes('usd'));
        });

        console.log(`\n📊 Additional potential stablecoins by keywords: ${keywordStablecoins.length}`);

        // Find ones not already tagged as stablecoins
        const untaggedKeywordMatches = keywordStablecoins.filter(crypto => {
            return !crypto.tags || !crypto.tags.includes('stablecoin');
        });

        console.log(`📋 Keyword matches NOT tagged as stablecoins: ${untaggedKeywordMatches.length}`);

        if (untaggedKeywordMatches.length > 0) {
            console.log('\nPotential untagged stablecoins (first 20):');
            untaggedKeywordMatches.slice(0, 20).forEach((coin, index) => {
                const price = coin.quote?.USD?.price || 'N/A';
                const tags = coin.tags ? coin.tags.join(', ') : 'No tags';
                console.log(`${index + 1}. ${coin.name} (${coin.symbol}) - Price: $${typeof price === 'number' ? price.toFixed(4) : price}, Tags: ${tags}`);
            });
        }

        // Compare with Messari stablecoins
        console.log('\n' + '='.repeat(80));
        console.log('COMPARISON WITH MESSARI STABLECOINS');
        console.log('='.repeat(80));

        // Get Messari stablecoins for comparison
        const { MessariClient } = require('@messari/sdk');
        const messariClient = new MessariClient({ apiKey: process.env.MESSARI_API_KEY });
        
        const messariData = await messariClient.request({ method: 'GET', path: '/metrics/v2/stablecoins' });
        const messariStablecoins = Array.isArray(messariData?.data) ? messariData.data : messariData;
        
        console.log(`Messari stablecoins: ${messariStablecoins.length}`);
        console.log(`CoinMarketCap stablecoins (tagged): ${stablecoinsByTag.length}`);
        console.log(`CoinMarketCap potential stablecoins (keyword): ${keywordStablecoins.length}`);

        // Try to find overlap by symbol
        const messariSymbols = new Set(messariStablecoins.map(s => s.symbol.toUpperCase()));
        const cmcStablecoinSymbols = new Set(stablecoinsByTag.map(s => s.symbol.toUpperCase()));

        const overlap = [...messariSymbols].filter(symbol => cmcStablecoinSymbols.has(symbol));
        const messariOnly = [...messariSymbols].filter(symbol => !cmcStablecoinSymbols.has(symbol));
        const cmcOnly = [...cmcStablecoinSymbols].filter(symbol => !messariSymbols.has(symbol));

        console.log(`\nSymbol overlap: ${overlap.length}`);
        console.log(`Messari only: ${messariOnly.length} (${messariOnly.slice(0, 10).join(', ')})`);
        console.log(`CoinMarketCap only: ${cmcOnly.length} (${cmcOnly.slice(0, 10).join(', ')})`);

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('SUMMARY');
        console.log('='.repeat(80));
        console.log(`🚀 CoinMarketCap found ${stablecoinsByTag.length} tagged stablecoins`);
        console.log(`📈 This is ${stablecoinsByTag.length > messariStablecoins.length ? 'MORE' : 'LESS'} than Messari's ${messariStablecoins.length} stablecoins`);
        
        if (stablecoinsByTag.length > messariStablecoins.length) {
            console.log(`💡 CoinMarketCap could potentially provide ${stablecoinsByTag.length - messariStablecoins.length} additional stablecoins!`);
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testCmcStablecoins();