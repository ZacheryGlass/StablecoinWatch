const https = require('https');
const express = require('express');
const cron = require('node-cron');
const messari = require('./utils/messari');
const scw = require('./utils/scw');
const util = require('./utils/cmn');
const cmc = require('./utils/cmc');

// CONSTANTS
const MINS_BETWEEN_UPDATE = 15;

// GLOBAL VARS
let glb_stablecoins = [];
let glb_totalMCap = 0;
let glb_totalVolume = 0;
let glb_platform_data = [];

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

/*----------------------------------------------
Function:       combineCoins
Description: 
------------------------------------------------*/
function combineCoins(msri_coins_list, cmc_coins_list, scw_coins_list) {
    // loop through each CMC coin
    cmc_coins_list.forEach((cmc_coin) => {
        // for the current cmc coin, check if the same coin exists in the cmc coin list
        let msri_coin = msri_coins_list.find((c) => c.symbol === cmc_coin.symbol);
        if (msri_coin) {
            cmc_coin.msri = msri_coin.msri;
            msri_coin.platforms.forEach((msri_pltfm) => {
                let cmc_pltfm = cmc_coin.platforms.find((p) => p.name === msri_pltfm.name);
                if (!cmc_pltfm) {
                    cmc_coin.platforms.push(msri_pltfm);
                }
            });
        } // if (msri_coin)

        let scw_coin = scw_coins_list.find((c) => c.symbol === cmc_coin.symbol);
        if (scw_coin) {
            cmc_coin.scw = scw_coin.scw;
            if (scw_coin.platforms)
                scw_coin.platforms.forEach((scw_pltfm) => {
                    let cmc_pltfm = cmc_coin.platforms.find((p) => p.name === scw_pltfm.name);
                    if (cmc_pltfm) {
                        if (scw_pltfm.contract_address) cmc_pltfm.contract_address = scw_pltfm.contract_address;
                    } else {
                        cmc_coin.platforms.push(scw_pltfm);
                    }
                });
        } //  if (scw_coin)
    });

    // here, check for coins that exist in SCW data but not CMC, if found - push to cmc_coins_list
    scw_coins_list.forEach((scwcoin) => {
        let cmc_coin = cmc_coins_list.find((c) => c.symbol === scwcoin.symbol);
        if (!cmc_coin) cmc_coins_list.push(scwcoin);
    });

    return cmc_coins_list;
} // end coinbinedCoins()

/*----------------------------------------------
Function:       fetchStablecoins
Description: 
------------------------------------------------*/
async function fetchStablecoins() {
    // pull new stablecoins data
    let fetching_msri = messari.getAllMessariStablecoins();
    let fetching_cmc = cmc.getAllCMCStablecoins();
    let fetching_scw = scw.getSCWStablecoins();

    // combined data from multiple APIs
    return Promise.all([fetching_msri, fetching_cmc, fetching_scw])
        .then(async (scoins_arr) => {
            let msri_coins_list = scoins_arr[0];
            let cmc_coins_list = scoins_arr[1];
            let scw_coins_list = scoins_arr[2];

            let ret_list = combineCoins(msri_coins_list, cmc_coins_list, scw_coins_list);

            // update the platform-specific supply for each coin
            await Promise.all(
                ret_list.map(async (coin) => {
                    await coin.updateMetrics();
                })
            );
            return ret_list;
        })
        .catch((e) => {
            console.log(e);
        });
} // fetchStablecoins()

/*----------------------------------------------
Function:       updateGlobalStablecoinData
Description: 
------------------------------------------------*/
function updateGlobalStablecoinData(new_stablecoin_data) {
    new_stablecoin_data.forEach((scoin_temp) => {
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
        return b.cmc.mcap - a.cmc.mcap;
    });
} // updateGlobalStablecoinData()

/*----------------------------------------------
Function:       updateGlobalPlatformData
Description: 
------------------------------------------------*/
async function updateGlobalPlatformData() {
    glb_platform_data = [];

    let sum = 0;

    glb_stablecoins.forEach((scoin) => {
        if (!scoin.platforms) return;
        if (!scoin.main) scoin.setMainDataSrc();

        // loop through each platform of the current scoin
        scoin.platforms.forEach((pltfm) => {
            // calculate the market cap of this coin on this platform only.
            let mcap_on_pltfm = (pltfm.supply / scoin.main.total_supply) * scoin.main.mcap;
            if (!mcap_on_pltfm) return;
            sum += mcap_on_pltfm;

            // check if the current scoin's platform is already in our global data
            let gbl_pltfm = glb_platform_data.find((p) => p.name == pltfm.name);

            if (gbl_pltfm) {
                // this platform is already in our global data (seen before)
                gbl_pltfm.total_mcap += mcap_on_pltfm;
            } else {
                // this platform is not in the global data, add the new platform to the global data
                glb_platform_data.push({
                    name: pltfm.name,
                    total_mcap: mcap_on_pltfm,
                });
            } // end if-else
        }); // end for each platform
    }); // end for each scoin

    glb_platform_data.push({
        name: 'Other / Unknown',
        total_mcap: glb_totalMCap - sum,
    });

    // sort global platform list
    glb_platform_data = glb_platform_data.sort(function (a, b) {
        return b.total_mcap - a.total_mcap;
    });

    // add string representatoin of supply on platform
    glb_platform_data.forEach((pltfm) => {
        pltfm.total_mcap_s = util.toDollarString(pltfm.total_mcap);
    });
} // updateGlobalPlatformData()

/*----------------------------------------------
Function:       updateGlobalMetrics
Description: 
------------------------------------------------*/
function updateGlobalMetrics() {
    glb_totalMCap = 0;
    glb_totalVolume = 0;

    glb_stablecoins.forEach(async (scoin) => {
        // update global total data
        if (scoin.cmc.mcap) glb_totalMCap += scoin.cmc.mcap;
        if (scoin.cmc.volume) glb_totalVolume += scoin.cmc.volume;
    });
} // updateGlobalMetrics()

/*----------------------------------------------
Function:       updateData
Description: 
------------------------------------------------*/
async function updateData() {
    // these functions must be called in this order
    let new_stablecoin_data = await fetchStablecoins();
    updateGlobalStablecoinData(new_stablecoin_data);
    updateGlobalMetrics();
    updateGlobalPlatformData();
    console.log('Data Updated.');
} // updateData()

/*-----------------------------------------------
                    Routes
-----------------------------------------------*/
app.get('/', async (req, res) => {
    let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
    // console.debug(glb_platform_data);
    res.render('home', {
        coins: glb_stablecoins,
        totalMCap: glb_totalMCap,
        totalMCap_s: util.toDollarString(glb_totalMCap),
        totalVolume: glb_totalVolume,
        totalVolume_s: util.toDollarString(glb_totalVolume),
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'home',
    });
}); // home

app.get('/donate', async (req, res) => {
    let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('donate', {
        totalMCap: glb_totalMCap,
        totalMCap_s: util.toDollarString(glb_totalMCap),
        totalVolume: glb_totalVolume,
        totalVolume_s: util.toDollarString(glb_totalVolume),
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'donate',
    });
}); // donate

// create chains page
app.get('/chains', async (req, res) => {
    let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('chains', {
        totalMCap: glb_totalMCap,
        totalMCap_s: util.toDollarString(glb_totalMCap),
        totalVolume: glb_totalVolume,
        totalVolume_s: util.toDollarString(glb_totalVolume),
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
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
