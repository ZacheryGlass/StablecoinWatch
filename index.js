const https = require('https');
const express = require('express');
const Messari = require('messari-api');
const MessariClient = new Messari();
var cron = require('node-cron');
var ethapikey = require('./keys').ethapikey;
var ethapi = require('etherscan-api').init(ethapikey);

// CONSTANTS
const TETHER_DECIMALS = 6;
const TETHER_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const STABLY_DECIMALS = 6;
const STABLY_CONTRACT_ADDRESS = '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe';

// GLOBAL VARS
let tether_eth_supply = 0;
let tether_btc_supply = 0;
let stably_eth_supply = 0;
let stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;
let totalEthMCap = 0;

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
cron.schedule('*/1 * * * *', updateData);

async function updateData() {
    // update tether on eth supply
    await ethapi.stats
        .tokensupply(null, TETHER_CONTRACT_ADDRESS)
        .then((data) => {
            tether_eth_supply = data.result / 10 ** TETHER_DECIMALS;
        });

    // update stably on eth supply
    await ethapi.stats
        .tokensupply(null, STABLY_CONTRACT_ADDRESS)
        .then((data) => {
            stably_eth_supply = data.result / 10 ** STABLY_DECIMALS;
        });

    // update tether on omni supply supply
    const url = 'https://api.omniexplorer.info/v1/property/31';

    https.get(url, (res) => {
        res.setEncoding('utf8');
        let body = '';
        res.on('data', (data) => {
            body += data;
        });
        res.on('end', () => {
            body = JSON.parse(body);
            tether_btc_supply = body.totaltokens;
        });
    });

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    totalMCap = 0;
    totalVolume = 0;
    totalEthMCap = 0;
    stablecoins_temp = [];

    // pull new stablecoins data
    allCoins.forEach((coin) => {
        if (coin.profile.sector == 'Stablecoins') {
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
                eth_supply: 0,
                btc_supply: 0,
            };
            // console.log(scoin.name);
            scoin.eth_supply = supply_on_ethereum(scoin);
            scoin.btc_supply = scoin.name == 'Tether' ? tether_btc_supply : 0;

            stablecoins_temp.push(scoin);
        }
    });

    // update global stablecoin data with newly pulled data
    stablecoins_temp.forEach((scoin_temp) => {
        let scoin_temp_found = false;

        stablecoins.forEach((scoin) => {
            if (scoin.name == scoin_temp.name) {
                scoin_temp_found = true;
                // new data found
                // replace scoin with scoin_temp in stablecoins list
                var index = stablecoins.indexOf(scoin);

                if (index !== -1) {
                    stablecoins[index] = scoin_temp;
                }
            }
        });

        // new coin found in data that wasn't already in global stablecoins list.
        // Add new coin to stablecoins list
        if (!scoin_temp_found) {
            stablecoins.push(scoin_temp);
        }
    });

    // update global total data
    stablecoins.forEach((scoin) => {
        totalMCap += scoin.mcap;
        totalVolume += scoin.volume;
        totalEthMCap += scoin.eth_supply;
    });

    // update tether on tron supply
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

function supply_on_ethereum(coin) {
    switch (coin.symbol) {
        case 'USDT':
            return tether_eth_supply;
            break;

        case 'USDS':
            return stably_eth_supply;
            break;

        default:
            if (coin.type == 'ERC-20') {
                return coin.mcap;
            } else {
                return 0;
            }
            break;
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
        totalEthMCap: totalEthMCap,
        totalEthMCap_s: roundMCap(totalEthMCap),
    });
});

// create dontate page
app.get('/donate', async (req, res) => {
    res.render('donate', {
        totalMCap: totalMCap,
        totalMCap_s: roundMCap(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: roundMCap(totalVolume),
        totalEthMCap: totalEthMCap,
        totalEthMCap_s: roundMCap(totalEthMCap),
    });
});

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
