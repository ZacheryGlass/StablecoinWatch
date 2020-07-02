const express = require('express');
const Messari = require('messari-api');
const MessariClient = new Messari();
var cron = require('node-cron');
var ethapikey = require('./keys').ethapikey;
var ethapi = require('etherscan-api').init(ethapikey);

// CONSTANTS
const TETHER_DECIMALS = 6;
const TETHER_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

// GLOBAL VARS
let tether_eth_supply = 0;
let stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
cron.schedule('*/10 * * * *', updateData);

async function updateData() {
    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    stablecoins = [];
    totalMCap = 0;
    totalVolume = 0;

    // update stablecoins data
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

    // update tether on eth supply
    ethapi.stats.tokensupply(null, TETHER_CONTRACT_ADDRESS).then((data) => {
        tether_eth_supply = data.result / 10 ** TETHER_DECIMALS;
    });

    // update tether on eth supply
    //https://www.npmjs.com/package/trongrid
    // tronapi.asset.getList('Tether', options);
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
        tetherEthSupply: tether_eth_supply,
    });
});

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
