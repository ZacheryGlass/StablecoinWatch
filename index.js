const https = require('https');
const express = require('express');
const cron = require('node-cron');

const messari = require('./utils/messari');

const util = require('./utils/cmn');
const cmc = require('./utils/cmc');

// CONSTANTS
const MINS_BETWEEN_UPDATE = 5;
const TETHER_OMNI_ID = 31;

// GLOBAL VARS
let glb_stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;
let glb_platform_data = [];

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

function combineCoins(msri_coins_list, cmc_coins_list) {
    // loop through each CMC coin
    cmc_coins_list.forEach((cmc_coin) => {
        // for the current messari coin, check if the same coin
        // exists in the cmc coin list
        let msri_coin = msri_coins_list.find(
            (c) => c.symbol === cmc_coin.symbol
        );
        if (msri_coin) {
            // coin found in both Messari and CMC data. Combined the platform data

            // if any platforms found from Messari API are not found by the CMC api, copy the CMC coin's platform list.
            msri_coin.platforms.forEach((msri_pltfm) => {
                let cmc_pltfm = cmc_coin.platforms.find(
                    (p) => p.name === msri_pltfm.name
                );

                if (!cmc_pltfm) {
                    // this platform was found in Messari API for this coin, but not CMC api
                    // add platform to CMC coin, which will be used as the final combined data.
                    cmc_coin.platforms.push(msri_pltfm);
                    console.log(
                        `Adding ${msri_pltfm.name} platform to ${cmc_coin.name}`
                    );
                }
            }); // for each platform found for this coin in the messari data
        } // if this cmc coins also exists in the messari coin list

        // at this point, the current cmc coin should have all platforms, from both APIs.

        // STOP GAP SOLUTION - Repace with 3rd data source, custom hard-coded data
        if (cmc_coin.name == 'Tether') {
            let tether_btc_pltfm = cmc_coin.platforms.find(
                (p) => p.name === 'Bitcoin'
            );
            if (tether_btc_pltfm)
                tether_btc_pltfm.contract_address = TETHER_OMNI_ID;
        }
    });

    // here, check for coins that exist in Messari data but not CMC, if found - push to cmc_coin_list
    /*
    if(){

        console.log(
            `${msri_coin.symbol} found in Messari data but not CMC. Consider adding manual CMC ticker list.`
        );
        cmc_coin_list.push(msri_coin);
    }
    */
    // return updated cmc coin list

    return cmc_coins_list;
} // end coinbinedCoins()

async function fetchStablecoins() {
    // pull new stablecoins data
    let fetching_msri = messari.getAllMessariStablecoins();
    let fetching_cmc = cmc.getCMCStablecoins(cmc.stablecoin_tickers);

    // combined data from multiple APIs
    return Promise.all([fetching_msri, fetching_cmc]).then(
        async (scoins_arr) => {
            let msri_coins_list = scoins_arr[0];
            let cmc_coins_list = scoins_arr[1];

            let ret_list = combineCoins(msri_coins_list, cmc_coins_list);

            // update the platform-specific supply for each coin
            await Promise.all(
                ret_list.map(async (coin) => {
                    await coin.updatePlatformsSupply();
                })
            );

            return ret_list;
        }
    );
} // fetchStablecoins()

function updateGlobalStablecoinData(new_stablecoin_data) {
    // update global stablecoin data with newly pulled Messari data
    new_stablecoin_data.forEach((scoin_temp) => {
        // console.log(scoin_temp.name, scoin_temp.platforms);

        let scoin_temp_found = false;

        glb_stablecoins.forEach((scoin) => {
            if (scoin.symbol == scoin_temp.symbol) {
                scoin_temp_found = true;
                // new data found, replace scoin with scoin_temp in glb_stablecoins list
                var index = glb_stablecoins.indexOf(scoin);
                if (index !== -1) glb_stablecoins[index] = scoin_temp;
            }
        });

        // new coin found in data that wasn't already in global stablecoins list.
        // Add new coin to global stablecoins list
        if (!scoin_temp_found) {
            glb_stablecoins.push(scoin_temp);
        }
    }); // end loop through new_stablecoin_data

    // sort global stablecoins list
    glb_stablecoins = glb_stablecoins.sort(function (a, b) {
        return b.mcap - a.mcap;
    });
} // updateGlobalStablecoinData()

async function updateGlobalPlatformData() {
    // reset global metrics
    totalMCap = 0;
    totalVolume = 0;
    glb_platform_data = [];

    await Promise.all(
        glb_stablecoins.map(async (scoin) => {
            // loop through each platform for the current scoin
            scoin.platforms.forEach((scoin_pltfm) => {
                var chain_in_gbl_data = false;
                // check if the current scoin's platform is already in our global data
                // TODO: Avoid nested for-each loops here.
                glb_platform_data.forEach((gbl_pltfm) => {
                    // if this platform is already in our global data (seen before)
                    // then sum the supply to the total
                    if (gbl_pltfm.name == scoin_pltfm.name) {
                        gbl_pltfm.scoin_total += scoin_pltfm.supply;
                        chain_in_gbl_data = true;
                    }
                });

                // if this scoin's platform is not in the global data,
                // add the new platform to the global data
                if (!chain_in_gbl_data) {
                    glb_platform_data.push({
                        name: scoin_pltfm.name,
                        scoin_total: scoin_pltfm.supply,
                    });
                } // end if
            }); // end for each

            // update global total data
            totalMCap += scoin.mcap;
            totalVolume += scoin.volume;
        })
    ); // end glb_stablecoins loop

    // sort global platform list
    glb_platform_data = glb_platform_data.sort(function (a, b) {
        return b.scoin_total - a.scoin_total;
    });

    // add string representatoin of supply on platform
    glb_platform_data.forEach((pltfm) => {
        pltfm.scoin_total_s = util.toDollarString(pltfm.scoin_total);
    });
} // updateGlobalPlatformData()

async function updateData() {
    let new_stablecoin_data = await fetchStablecoins();

    // new_stablecoin_data.forEach((coin) => {
    //     if (coin.name === 'Tether') {
    //         console.log(coin.platforms);
    //     }
    // });

    updateGlobalStablecoinData(new_stablecoin_data);
    updateGlobalPlatformData();
} // updateData()

/*-----------------------------------------------
                    Routes
-----------------------------------------------*/
app.get('/', async (req, res) => {
    let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');

    res.render('home', {
        coins: glb_stablecoins,
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
    let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
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
    let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('chains', {
        totalMCap: totalMCap,
        totalMCap_s: util.toDollarString(totalMCap),
        totalVolume: totalVolume,
        totalVolume_s: util.toDollarString(totalVolume),
        totalETHMCap: eth_data.scoin_total,
        totalETHMCap_s: eth_data.scoin_total_s,
        glb_platform_data: glb_platform_data,
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
