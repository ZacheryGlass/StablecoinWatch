const https = require('https');
const express = require('express');
const Messari = require('messari-api');
const MessariClient = new Messari();
var cron = require('node-cron');
const { Console } = require('console');
var ethapikey = require('./keys').ethapikey;
var ethapi = require('etherscan-api').init(ethapikey);


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


// CONSTANTS
const TETHER_DECIMALS = 6;
const TETHER_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const STABLY_DECIMALS = 6;
const STABLY_CONTRACT_ADDRESS = '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe';

// GLOBAL VARS
let stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;
let totalETHMCap = 0;
let totalBTCMCap = 0;
let totalBNBMCap = 0;
let totalSupplyOnChain = {}


// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
cron.schedule('*/1 * * * *', updateData);

async function updateData() {
    // pull new stablecoins data
    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;
    stablecoins_temp = [];
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
                chain_supply: {},
            };

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

    // reset total metrics
    totalMCap = 0;
    totalVolume = 0;
    // totalETHMCap = 0;
    // totalBTCMCap = 0;
    // totalBNBMCap = 0;

    // reset per-blockchain metrics
    totalSupplyOnChain = {}
    console.log('Keys cleared. ')
    console.log(totalSupplyOnChain)
    
    stablecoins.forEach(async (scoin) => {
        // update blockchain specific supply data for stablecoins which
        // have coins on multiple blockchains
        switch (scoin.symbol) {
            // Tether
            case 'USDT':
                scoin.chain_supply['Bitcoin']  = { num: 0 }
                scoin.chain_supply['Tron']     = { num: 0 }
                scoin.chain_supply['Ethereum'] = { num: 0 }

                // update Tether on ETH supply
                await ethapi.stats
                    .tokensupply(null, TETHER_CONTRACT_ADDRESS)
                    .then((data) => {
                        let tether_eth_supply =
                            data.result / 10 ** TETHER_DECIMALS;
                        scoin.chain_supply['Ethereum'].num = tether_eth_supply;
                    });

                // update Tether on BTC supply
                const omni_api_url =
                    'https://api.omniexplorer.info/v1/property/31';
                await https.get(omni_api_url, async (res) => {
                    res.setEncoding('utf8');
                    let body = '';
                    await res.on('data', async (data) => {
                        body += data;
                    });
                    await res.on('end', async () => {
                        body = JSON.parse(body);

                        scoin.chain_supply['Bitcoin'].num = body.totaltokens;
                        scoin.chain_supply['Tron'].num =
                            scoin.mcap -
                            scoin.chain_supply['Bitcoin'].num -
                            scoin.chain_supply['Ethereum'].num;
                    });
                });
                // update Tether on Tron supply

                break;

            // Stably Dollar
            case 'USDS':
                scoin.chain_supply['Ethereum']      = { num: 0 }
                scoin.chain_supply['Binance Chain'] = { num: 0 }
                // update stably on ETH supply
                await ethapi.stats
                    .tokensupply(null, STABLY_CONTRACT_ADDRESS)
                    .then((data) => {
                        let stably_eth_supply = 0;
                        stably_eth_supply = data.result / 10 ** STABLY_DECIMALS;
                        scoin.chain_supply['Ethereum'].num = stably_eth_supply;
                        scoin.chain_supply['Binance Chain'].num = scoin.mcap - stably_eth_supply;
                    });
                break;

            default:
                switch (scoin.type) {
                    case 'ERC-20':
                        scoin.chain_supply['Ethereum'] = { num: 0 }
                        scoin.chain_supply['Ethereum'].num = scoin.mcap;
                        break;
                    case 'TRC-20':
                        scoin.chain_supply['Tron'] = { num: 0 }
                        scoin.chain_supply['Tron'].num = scoin.mcap;
                        break;
                    case 'BEP2':
                        scoin.chain_supply['Binance Chain'] = { num: 0 }
                        scoin.chain_supply['Binance Chain'].num = scoin.mcap;
                        break;
                    case 'Native':
                        scoin.chain_supply[scoin.name] = { num: 0 }
                        scoin.chain_supply[scoin.name].num = scoin.mcap;
                        break;
                    default:
                        scoin.chain_supply['Unknown'] = { num: 0 }
                        scoin.chain_supply['Unknown'].num = scoin.mcap;
                        break;
                } // end inner-switch
                break;
        } // end switch

        
        // await sleep(0500);
        for (let key in scoin.chain_supply) {
            // console.log('\t', key, scoin.chain_supply[key]);
                if( !(key in totalSupplyOnChain) ) {
                    totalSupplyOnChain[key] = {};
                    totalSupplyOnChain[key].num = 0;
                    console.log(`New Key: ${key}`)
                }
            totalSupplyOnChain[key].num += scoin.chain_supply[key].num;
            totalSupplyOnChain[key].str = roundMCap(totalSupplyOnChain[key].num);
        }

        // update global total data
        totalMCap += scoin.mcap;
        totalVolume += scoin.volume;
        // totalETHMCap += scoin.chain_supply['Ethereum']
        //     ? scoin.chain_supply['Ethereum']
        //     : 0;
        // totalBTCMCap += scoin.chain_supply['Bitcoin']
        //     ? scoin.chain_supply['Bitcoin']
        //     : 0;
        // totalBNBMCap += scoin.bnb_supply ? scoin.bnb_supply : 0;
    }); // end stablecoins loop


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
        totalETHMCap: totalSupplyOnChain.Ethereum.num,
        totalETHMCap_s: roundMCap(totalSupplyOnChain.Ethereum.num),
    });
});

// create dontate page
app.get('/donate', async (req, res) => {
    res.render('donate', {
        totalMCap: totalMCap,
        totalMCap_s: roundMCap(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: roundMCap(totalVolume),
        totalETHMCap: totalSupplyOnChain.Ethereum.num,
        totalETHMCap_s: roundMCap(totalSupplyOnChain.Ethereum.num),
    });
});

// create dontate page
app.get('/chains', async (req, res) => {
    res.render('chains', {
        totalMCap: totalMCap,
        totalMCap_s: roundMCap(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: roundMCap(totalVolume),
        totalETHMCap: totalSupplyOnChain.Ethereum.num,
        totalETHMCap_s: roundMCap(totalSupplyOnChain.Ethereum.num),
        totalSupplyOnChain: totalSupplyOnChain,

    });
});

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
