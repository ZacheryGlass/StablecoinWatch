const https = require('https');
const express = require('express');
const cron = require('node-cron');

const messari = require('./utils/messari');
const etherscan = require('./utils/etherscan');
const omni = require('./utils/omni');
const util = require('./utils/cmn');
const cmc = require('./utils/cmc');

// CONSTANTS
const MINS_BETWEEN_UPDATE = 5;
const TETHER_DECIMALS = 6;
const TETHER_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const TETHER_OMNI_ID = 31;
const STABLY_DECIMALS = 6;
const STABLY_CONTRACT_ADDRESS = '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe';

// GLOBAL VARS
let stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;
let totalSupplyOnChain = [];

// cannot pull from API bc CMC has non-stablecoins listed
// as stablecoins in API response.
let cmc_ticker_list = [
    'USDT',
    'USDC',
    'PAX',
    'BUSD',
    'TUSD',
    'HUSD',
    'DAI',
    'LUNA',
    'RSR',
    'EURS',
    'SUSD',
    'GUSD',
    'SBD',
    'USDS',
    'USDK',
    'USDQ',
    'EOSDT',
];

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

async function updateData() {
    let l = await cmc.pullCMC( cmc_ticker_list );

    console.log(l);
    process.exit();

    // pull new stablecoins data
    stablecoins_temp = await messari.getMessariStablecoins();

    // update global stablecoin data with newly pulled data
    stablecoins_temp.forEach((scoin_temp) => {
        let scoin_temp_found = false;
        // TODO: BUG HERE
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
    }); // end loop through stablecoins_temp

    // reset total metrics
    totalMCap = 0;
    totalVolume = 0;

    // reset per-blockchain metrics
    totalSupplyOnChain = [];

    stablecoins.forEach(async (scoin) => {
        // update blockchain specific supply data for stablecoins which
        // have coins on multiple blockchains
        switch (scoin.symbol) {
            // Tether
            case 'USDT':
                scoin.chain_supply['Bitcoin'] = { num: 0 };
                scoin.chain_supply['Tron'] = { num: 0 };
                scoin.chain_supply['Ethereum'] = { num: 0 };

                // update Tether on ETH supply
                scoin.chain_supply[
                    'Ethereum'
                ].num = await etherscan.getTokenSupply(
                    TETHER_CONTRACT_ADDRESS,
                    TETHER_DECIMALS
                );
                // update Tether on BTC supply
                scoin.chain_supply['Bitcoin'].num = await omni.getTokenSupply(
                    TETHER_OMNI_ID
                );

                // update Tether on TRON supply
                scoin.chain_supply['Tron'].num =
                    scoin.mcap -
                    (scoin.chain_supply['Bitcoin'].num +
                        scoin.chain_supply['Ethereum'].num);
                break;

            // Stably Dollar
            case 'USDS':
                scoin.chain_supply['Ethereum'] = { num: 0 };
                scoin.chain_supply['Binance Chain'] = { num: 0 };
                // update stably on ETH supply
                scoin.chain_supply[
                    'Ethereum'
                ].num = await etherscan.getTokenSupply(
                    STABLY_CONTRACT_ADDRESS,
                    STABLY_DECIMALS
                );
                // update stably on BNB supply
                scoin.chain_supply['Binance Chain'].num =
                    scoin.mcap - scoin.chain_supply['Ethereum'].num;
                break;

            default:
                switch (scoin.type) {
                    case 'ERC-20':
                        scoin.chain_supply['Ethereum'] = { num: 0 };
                        scoin.chain_supply['Ethereum'].num = scoin.mcap;
                        break;
                    case 'TRC-20':
                        scoin.chain_supply['Tron'] = { num: 0 };
                        scoin.chain_supply['Tron'].num = scoin.mcap;
                        break;
                    case 'BEP2':
                        scoin.chain_supply['Binance Chain'] = { num: 0 };
                        scoin.chain_supply['Binance Chain'].num = scoin.mcap;
                        break;
                    case 'Native':
                        scoin.chain_supply[scoin.name] = { num: 0 };
                        scoin.chain_supply[scoin.name].num = scoin.mcap;
                        break;
                    default:
                        scoin.chain_supply['Unknown'] = { num: 0 };
                        scoin.chain_supply['Unknown'].num = scoin.mcap;
                        break;
                } // end inner-switch
                break;
        } // end switch

        // populate totalSupplyOnChain
        for (let key in scoin.chain_supply) {
            var chain_exists = false;
            totalSupplyOnChain.forEach((chain_scoin_data) => {
                // new coin
                if (chain_scoin_data.name == key) {
                    chain_scoin_data.scoin_total += scoin.chain_supply[key].num;
                    chain_scoin_data.scoin_total_s = util.toDollarString(
                        scoin.chain_supply[key].num
                    );
                    chain_exists = true;
                }
            }); // end for each

            // seen before
            if (!chain_exists) {
                totalSupplyOnChain.push({
                    name: key,
                    scoin_total: scoin.chain_supply[key].num,
                    scoin_total_s: util.toDollarString(scoin.chain_supply[key].num),
                });
            }
        }

        // sort totalSupplyOnChain
        totalSupplyOnChain = totalSupplyOnChain.sort(function (a, b) {
            return b.scoin_total - a.scoin_total;
        });

        // update global total data
        totalMCap += scoin.mcap;
        totalVolume += scoin.volume;
    }); // end stablecoins loop
}

/*-----------------------------------------------
                    Routes
-----------------------------------------------*/
app.get('/', async (req, res) => {
    let eth_data = totalSupplyOnChain.find(
        (chain) => chain.name === 'Ethereum'
    );

    res.render('home', {
        coins: stablecoins,
        totalMCap: totalMCap,
        totalMCap_s: util.toDollarString(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: util.toDollarString(totalVolume),
        totalETHMCap: eth_data.scoin_total,
        totalETHMCap_s: eth_data.scoin_total_s,
        active: 'home',
    });
}); // home

app.get('/donate', async (req, res) => {
    let eth_data = totalSupplyOnChain.find(
        (chain) => chain.name === 'Ethereum'
    );
    res.render('donate', {
        totalMCap: totalMCap,
        totalMCap_s: util.toDollarString(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: util.toDollarString(totalVolume),
        totalETHMCap: eth_data.scoin_total,
        totalETHMCap_s: eth_data.scoin_total_s,
        active: 'donate',
    });
}); // donate

// create chains page
app.get('/chains', async (req, res) => {
    let eth_data = totalSupplyOnChain.find(
        (chain) => chain.name === 'Ethereum'
    );
    res.render('chains', {
        totalMCap: totalMCap,
        totalMCap_s: util.toDollarString(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: util.toDollarString(totalVolume),
        totalETHMCap: eth_data.scoin_total,
        totalETHMCap_s: eth_data.scoin_total_s,
        totalSupplyOnChain: totalSupplyOnChain,
        active: 'chains',
    });
}); // chains

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
