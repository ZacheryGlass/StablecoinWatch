require('dotenv').config();
const { MessariClient } = require('@messari/sdk');

async function countStablecoins() {
    const apiKey = process.env.MESSARI_API_KEY;
    
    if (!apiKey) {
        console.error('MESSARI_API_KEY not found in .env file');
        process.exit(1);
    }

    const client = new MessariClient({ apiKey });
    
    try {
        console.log('Fetching stablecoins from Messari API...');
        const data = await client.request({ method: 'GET', path: '/metrics/v2/stablecoins' });
        
        const list = Array.isArray(data?.data) ? data.data : data;
        const count = list ? list.length : 0;
        
        console.log(`Total stablecoins returned: ${count}`);
        
        if (list && list.length > 0) {
            console.log('\nFirst 10 stablecoins:');
            list.slice(0, 10).forEach((coin, index) => {
                const name = coin.name || coin.slug || coin.symbol || 'Unknown';
                const symbol = coin.symbol || '';
                console.log(`${index + 1}. ${name} (${symbol})`);
            });
        }
        
    } catch (error) {
        console.error('Error fetching stablecoins:', error.message);
    }
}

countStablecoins();