const express = require('express');
const Messari = require('messari-api');
const MessariClient = new Messari();
var cron = require('node-cron');

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));

let stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;
updateData();
cron.schedule('*/1 * * * *', updateData);

async function updateData() {
    let d = new Date();
    console.log(d.getTime());

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    stablecoins = [];
    totalMCap = 0;
    totalVolume = 0;

    allCoins.forEach((coin) => {
        if (coin.profile.sector === 'Stablecoins') {
            totalMCap += coin.metrics.marketcap.current_marketcap_usd;
            totalVolume += coin.metrics.market_data.real_volume_last_24_hours;
            let scoin = {
                name: coin.name,
                symbol: coin.symbol,
                mcap_s: roundMCap(coin.metrics.marketcap.current_marketcap_usd),
                mcap: coin.metrics.marketcap.current_marketcap_usd,
                type: coin.profile.token_details.type,
                desc: coin.profile.overview
                    ? coin.profile.overview.replace(/<[^>]*>?/gm, '')
                    : 'No  description available.',
                volume_s: roundMCap(
                    coin.metrics.market_data.real_volume_last_24_hours
                ),
                volume: coin.metrics.market_data.real_volume_last_24_hours,
            };

            stablecoins.push(scoin);
        }
    });
}

function roundMCap(v) {
    if (!v) {
        return '$0';
    }

    if (v > 1000000000) {
        return '$' + (v / 1000000000).toFixed(2) + 'B';
    } else if (v > 1000000) {
        return '$' + (v / 1000000).toFixed(1) + 'M';
    } else {
        return '$' + (v / 1000).toFixed(0) + ',' + (v % 1000).toFixed(0);
    }
}

// create home page
app.get('/', async (req, res) => {
    res.render('home', {
        coins: stablecoins,
        totalMCap: totalMCap,
        totalMCap_s: roundMCap(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: roundMCap(totalVolume),
    });
});

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
