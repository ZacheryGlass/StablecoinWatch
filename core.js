/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const messari = require('./apis/messari');
const lcl = require('./apis/local');
const util = require('./util');
const cmc = require('./apis/cmc');

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
let data = {};
data.coins = [];
data.totalMCap = 0;
data.totalVolume = 0;
data.platform_data = [];

const CLR = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function: 
        print_custom
Description:
        Print a message to the console in a specified
        color with a specified prefix.
---------------------------------------------------------*/
const print_custom = function (clr, prefix, msgs) {
    if (global.DEBUG) process.stdout.write(clr);
    process.stdout.write(prefix + ':');
    for (let i = 0; i < msgs.length; i++) {
        process.stdout.write(' ');
        process.stdout.write('' + msgs[i]);
    }
    process.stdout.write('\n');
    if (global.DEBUG) process.stdout.write(CLR.reset);
};

/*---------------------------------------------------------
Function: console.warn
Description: Print warnings to the console
---------------------------------------------------------*/
console.warn = function () {
    print_custom(CLR.yellow, 'WARNING', arguments);
};

/*---------------------------------------------------------
Function: console.info
Description: Print info to the console
---------------------------------------------------------*/
console.info = function () {
    print_custom(CLR.green, 'INFO', arguments);
};

/*---------------------------------------------------------
Function: console.error
Description: Print errors to the console
---------------------------------------------------------*/
console.error = function () {
    print_custom(CLR.red, 'ERROR', arguments);
};

/*---------------------------------------------------------
Function: console.error
Description: Print errors to the console
---------------------------------------------------------*/
console.debug = function () {
    if (global.DEBUG) print_custom(CLR.cyan, 'DEBUG', arguments);
};

/*---------------------------------------------------------
Function:
        combineCoins
Description:
        Combine the data from mutlipe sources into a
        a single Coin object.
---------------------------------------------------------*/
function combineCoins(msri_coins_list, cmc_coins_list, lcl_coins_list) {
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

        let lcl_coin = lcl_coins_list.find((c) => c.symbol === cmc_coin.symbol);
        if (lcl_coin) {
            cmc_coin.lcl = lcl_coin.lcl;
            if (lcl_coin.platforms)
                lcl_coin.platforms.forEach((lcl_pltfm) => {
                    let cmc_pltfm = cmc_coin.platforms.find((p) => p.name === lcl_pltfm.name);
                    if (cmc_pltfm) {
                        if (lcl_pltfm.contract_address) cmc_pltfm.contract_address = lcl_pltfm.contract_address;
                    } else {
                        cmc_coin.platforms.push(lcl_pltfm);
                    }
                });
        } // if (lcl_coin)
    });

    // here, check for coins that exist in lcl data but not CMC, if found - push to cmc_coins_list
    lcl_coins_list.forEach((lclcoin) => {
        let cmc_coin = cmc_coins_list.find((c) => c.symbol === lclcoin.symbol);
        if (!cmc_coin) cmc_coins_list.push(lclcoin);
    });

    return cmc_coins_list;
} // end coinbinedCoins()

/*---------------------------------------------------------
Function:
        fetchCoins
Description:
        Pull Coin data from various supported APIs.
        This function will build and return a list of
        Coin objects.
---------------------------------------------------------*/
async function fetchCoins() {
    // pull new coins data
    let fetching_msri = messari.getAllMessariCoins();
    let fetching_cmc = cmc.getAllCmcCoins();
    let fetching_lcl = lcl.getLocalCoins();

    return Promise.all([fetching_msri, fetching_cmc, fetching_lcl])
        .then(async (scoins_arr) => {
            let msri_coins_list = scoins_arr[0];
            let cmc_coins_list = scoins_arr[1];
            let lcl_coins_list = scoins_arr[2];

            let ret_list = combineCoins(msri_coins_list, cmc_coins_list, lcl_coins_list);

            // update the platform-specific supply for each coin
            await Promise.all(ret_list.map(async (coin) => coin.updateDerivedMetrics()));
            console.debug('coins fetched:', ret_list.length);
            return ret_list;
        })
        .catch((e) => {
            console.error(e);
        });
} // fetchCoins()

/*---------------------------------------------------------
Function:
        updateCoinData
Description:
        TODO
---------------------------------------------------------*/
function updateCoinData(new_coin_data) {
    new_coin_data.forEach((scoin_temp) => {
        let scoin_temp_found = false;

        data.coins.forEach((scoin) => {
            if (scoin.symbol == scoin_temp.symbol) {
                scoin_temp_found = true;
                // new data found, replace scoin with scoin_temp in data.coins list
                var index = data.coins.indexOf(scoin);
                if (index !== -1) data.coins[index] = scoin_temp;
            }
        });

        // new coin found in data that wasn't already in global coins list.
        // Add new coin to global coins list
        if (!scoin_temp_found) {
            data.coins.push(scoin_temp);
        }
    }); // end loop through new_coin_data

    // sort global coins list
    data.coins = data.coins.sort(function (a, b) {
        return b.main.mcap - a.main.mcap;
    });
} // updateCoinData()

/*---------------------------------------------------------
Function:
        updatePlatformData
Description:
        TODO
---------------------------------------------------------*/
async function updatePlatformData() {
    data.platform_data = [];

    let sum = 0;

    data.coins.forEach((scoin) => {
        if (!scoin.platforms) return;
        if (!scoin.main.total_supply) return;
        if (!scoin.main) scoin.setMainDataSrc();

        // loop through each platform of the current scoin
        scoin.platforms.forEach((pltfm) => {
            // calculate the market cap of this coin on this platform only.
            let mcap_on_pltfm = (pltfm.supply / scoin.lcl.total_supply) * scoin.main.mcap;
            // let mcap_on_pltfm = pltfm.supply * scoin.main.price;

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
                    uri: pltfm.name.replace(' ', '_'),
                });
            } // end if-else
        }); // end for each platform
    }); // end for each scoin

    if (data.totalMCap - sum > 1000000)
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

    data.coins.forEach(async (scoin) => {
        // update global total data
        if (scoin.main.mcap) data.totalMCap += scoin.main.mcap;
        if (scoin.main.volume) data.totalVolume += scoin.main.volume;
    });

    data.totalMCap_s = util.toDollarString(data.totalMCap);
    data.totalVolume_s = util.toDollarString(data.totalVolume);
} // updateMetrics()

/*---------------------------------------------------------
Function:
        updateData
Description:
        TODO
---------------------------------------------------------*/
async function updateData() {
    try {
        let new_coin_data = await fetchCoins();
        updateCoinData(new_coin_data);
        updateMetrics();
        updatePlatformData();
        console.info('Data Updated.');
    } catch (e) {
        console.error(` ***CRITICAL*** Could not update data: ${e}`);
    }
} // updateData()

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
exports.updateData = updateData;
exports.data = data;
