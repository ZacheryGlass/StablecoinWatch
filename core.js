/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const messari = require('./api/messari');
const scw = require('./api/scw');
const util = require('./util');
const cmc = require('./api/cmc');

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
let data = {};
data.stablecoins = [];
data.totalMCap = 0;
data.totalVolume = 0;
data.platform_data = [];

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function:
        combineCoins
Description:
        Combine the data from mutlipe sources into a
        a single Stablecoin object.
---------------------------------------------------------*/
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
        } // if (scw_coin)
    });

    // here, check for coins that exist in SCW data but not CMC, if found - push to cmc_coins_list
    scw_coins_list.forEach((scwcoin) => {
        let cmc_coin = cmc_coins_list.find((c) => c.symbol === scwcoin.symbol);
        if (!cmc_coin) cmc_coins_list.push(scwcoin);
    });

    return cmc_coins_list;
} // end coinbinedCoins()

/*---------------------------------------------------------
Function:
        fetchStablecoins
Description:
        Pull Stablecoin data from various supported APIs.
        This function will build and return a list of
        Stablecoin objects.
---------------------------------------------------------*/
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

/*---------------------------------------------------------
Function:
        updateStablecoinData
Description:
        TODO
---------------------------------------------------------*/
function updateStablecoinData(new_stablecoin_data) {
    new_stablecoin_data.forEach((scoin_temp) => {
        let scoin_temp_found = false;

        data.stablecoins.forEach((scoin) => {
            if (scoin.symbol == scoin_temp.symbol) {
                scoin_temp_found = true;
                // new data found, replace scoin with scoin_temp in data.stablecoins list
                var index = data.stablecoins.indexOf(scoin);
                if (index !== -1) data.stablecoins[index] = scoin_temp;
            }
        });

        // new coin found in data that wasn't already in global stablecoins list.
        // Add new coin to global stablecoins list
        if (!scoin_temp_found) {
            data.stablecoins.push(scoin_temp);
        }
    }); // end loop through new_stablecoin_data

    // sort global stablecoins list
    data.stablecoins = data.stablecoins.sort(function (a, b) {
        return b.cmc.mcap - a.cmc.mcap;
    });
} // updateStablecoinData()

/*---------------------------------------------------------
Function:
        updatePlatformData
Description:
        TODO
---------------------------------------------------------*/
async function updatePlatformData() {
    data.platform_data = [];

    let sum = 0;

    data.stablecoins.forEach((scoin) => {
        if (!scoin.platforms) return;
        if (!scoin.main) scoin.setMainDataSrc();

        // loop through each platform of the current scoin
        scoin.platforms.forEach((pltfm) => {
            // calculate the market cap of this coin on this platform only.
            let mcap_on_pltfm = (pltfm.supply / scoin.main.total_supply) * scoin.main.mcap;
            if (!mcap_on_pltfm) return;
            sum += mcap_on_pltfm;

            // check if the current scoin's platform is already in our global data
            let gbl_pltfm = data.platform_data.find((p) => p.name == pltfm.name);

            if (gbl_pltfm) {
                // this platform is already in our global data (seen before)
                gbl_pltfm.total_mcap += mcap_on_pltfm;
            } else {
                // this platform is not in the global data, add the new platform to the global data
                data.platform_data.push({
                    name: pltfm.name,
                    total_mcap: mcap_on_pltfm,
                });
            } // end if-else
        }); // end for each platform
    }); // end for each scoin

    data.platform_data.push({
        name: 'Other / Unknown',
        total_mcap: data.totalMCap - sum,
    });

    // sort global platform list
    data.platform_data = data.platform_data.sort(function (a, b) {
        return b.total_mcap - a.total_mcap;
    });

    // add string representatoin of supply on platform
    data.platform_data.forEach((pltfm) => {
        pltfm.total_mcap_s = util.toDollarString(pltfm.total_mcap);
    });
} // updatePlatformData()

/*---------------------------------------------------------
Function:
        updateMetrics
Description:
        TODO
---------------------------------------------------------*/
function updateMetrics() {
    data.totalMCap = 0;
    data.totalVolume = 0;

    data.stablecoins.forEach(async (scoin) => {
        // update global total data
        if (scoin.cmc.mcap) data.totalMCap += scoin.cmc.mcap;
        if (scoin.cmc.volume) data.totalVolume += scoin.cmc.volume;
    });
} // updateMetrics()

/*---------------------------------------------------------
Function:
        updateData
Description:
        TODO
---------------------------------------------------------*/
async function updateData() {
    let new_stablecoin_data = await fetchStablecoins();
    updateStablecoinData(new_stablecoin_data);
    updateMetrics();
    updatePlatformData();
    console.log('Data Updated.');
} // updateData()

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports.updateData = updateData;
module.exports.data = data;
