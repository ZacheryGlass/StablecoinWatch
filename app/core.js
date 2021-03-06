/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const util = require('./util');
const cron = require('node-cron');
const MSRIInterface = require('../interface/datasource/messari');
const SCWInterface = require('../interface/datasource/scw');
const CMCInterface = require('../interface/datasource/cmc');
const CGKOInterface = require('../interface/datasource/cgko');

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
let INTF = null;
let DATA = {
    stablecoins: [],
    platform_data: [],
    metrics: {
        totalMCap: 0,
        totalVolume: 0,
    },
};

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function: start
Description: start data gathering. Update rate
    should be divisible by/into 60.
---------------------------------------------------------*/
function start(update_rate) {
    /*----------------------------------------------------
    Init datasource APIs
    ----------------------------------------------------*/
    INTF = {
        messari: new MSRIInterface(15), // 15 mins
        coinMarketCap: new CMCInterface(60 * 12), // 12 hours
        stablecoinWatch: new SCWInterface(60), // 1 hour
        coinGecko: new CGKOInterface(60), // 1 hour 
    };

    /*----------------------------------------------------
    update data for first time
    ----------------------------------------------------*/
    update();

    /*----------------------------------------------------
    Schedule data update at specified rate
    ----------------------------------------------------*/
    cron.schedule(`*/${update_rate} * * * *`, update);
} /* start() */

/*---------------------------------------------------------
Function:
        combineCoins
Description:
        Combine the data from mutlipe sources into a
        a single Stablecoin object.
Node:   This function needs a re-write to be more generic
---------------------------------------------------------*/
async function combineCoins(msri_coins_list, cmc_coins_list, cgko_coins_list, scw_coins_list) {
    /*----------------------------------------------------
    Loop through each CMC coin
    ----------------------------------------------------*/
    cmc_coins_list.forEach((cmc_coin) => {
        /*----------------------------------------------------
        for the current cmc coin, check if the same coin exists
        in the cmc coin list
        ----------------------------------------------------*/
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

        /*----------------------------------------------------
        for the current cmc coin, check if the same coin exists
        in the cgko coin list
        ----------------------------------------------------*/
        let cgko_coin = cgko_coins_list.find((c) => c.symbol === cmc_coin.symbol);
        if (cgko_coin) {
            cmc_coin.cgko = cgko_coin.cgko;
            // cgko_coin.platforms.forEach((cgko_pltfm) => {
            //     let cmc_pltfm = cmc_coin.platforms.find((p) => p.name === cgko_pltfm.name);
            //     if (!cmc_pltfm) {
            //         cmc_coin.platforms.push(cgko_pltfm);
            //     }
            // });
        } // if (cgko_coin)

        let scw_coin = scw_coins_list.find((c) => c.symbol === cmc_coin.symbol);
        if (scw_coin) {
            cmc_coin.scw = scw_coin.scw;
            if (scw_coin.platforms)
                scw_coin.platforms.forEach((scw_pltfm) => {
                    let cmc_pltfm = cmc_coin.platforms.find((p) => p.name === scw_pltfm.name);
                    if (cmc_pltfm) {
                        if (scw_pltfm.contract_address) cmc_pltfm.contract_address = scw_pltfm.contract_address;
                        if (scw_pltfm.exclude_addresses) cmc_pltfm.exclude_addresses = scw_pltfm.exclude_addresses;
                        if (scw_pltfm.total_supply) cmc_pltfm.total_supply = scw_pltfm.total_supply;
                    } else {
                        cmc_coin.platforms.push(scw_pltfm);
                    }
                });
        } // if (scw_coin)
    });

    /*----------------------------------------------------
    Check for coins that exist in SCW data but not CMC
    if found, push to cmc_coins_list
    ----------------------------------------------------*/
    scw_coins_list.forEach((scwcoin) => {
        let cmc_coin = cmc_coins_list.find((c) => c.symbol === scwcoin.symbol);
        if (!cmc_coin) cmc_coins_list.push(scwcoin);
    });

    /*----------------------------------------------------
    Update the platform-specific supply data for each coin
    and return the coin list
    ----------------------------------------------------*/
    return Promise.all(cmc_coins_list.map(async (coin) => coin.updateDerivedMetrics()));
} // end combineCoins()

/*---------------------------------------------------------
Function:
        fetchStablecoins
Description:
        Pull Stablecoin data from various supported interface/
        datasource. This function will build and return a
        list of Stablecoin objects.
NOTE:   This function needs a re-write to be more generic
        with regards to multiple API support
---------------------------------------------------------*/
async function fetchStablecoins() {
    /*----------------------------------------------------
    Pull new stablecoins data
    ----------------------------------------------------*/
    let fetching_msri = INTF.messari.getStablecoins();
    let fetching_cmc = INTF.coinMarketCap.getStablecoins();
    let fetching_cgko = INTF.coinGecko.getStablecoins();
    let fetching_scw = INTF.stablecoinWatch.getStablecoins();

    /*----------------------------------------------------
    Combined data from multiple interface/datasource
    ----------------------------------------------------*/
    return Promise.all([fetching_msri, fetching_cmc, fetching_cgko, fetching_scw])
        .then((scoins_arr) => {
            return combineCoins(scoins_arr[0], scoins_arr[1], scoins_arr[2], scoins_arr[3]);
        })
        .catch((e) => {
            console.error(e);
        });
} // fetchStablecoins()

/*---------------------------------------------------------
Function:
        updateStablecoinData
Description:
        update the list of stablecoins globally
---------------------------------------------------------*/
function updateStablecoinData(new_coin_list, old_coin_list) {
    /*----------------------------------------------------
    Loop through new coin list
    ----------------------------------------------------*/
    new_coin_list.forEach((cur_new_coin) => {
        /*----------------------------------------------------
        Check if the this coin exists in the old coin list
        ----------------------------------------------------*/
        let old_coin = old_coin_list.find((scoin) => scoin.symbol == cur_new_coin.symbol);

        /*----------------------------------------------------
        If this coin exists in the old coin list, replace it
        with the new coin data. Otherwise, add it to the list
        ----------------------------------------------------*/
        if (old_coin) {
            let index = old_coin_list.indexOf(old_coin);
            if (index !== -1) old_coin_list[index] = cur_new_coin;
        } else {
            old_coin_list.push(cur_new_coin);
        }
    }); // end loop through new_coin_list

    /*----------------------------------------------------
    Sort the stablecoins list
    ----------------------------------------------------*/
    old_coin_list.sort(util.sortObjByNumProperty('main', 'circulating_mcap'));

    return old_coin_list;
} // updateStablecoinData()

/*---------------------------------------------------------
Function:
        calcPlatformData
Description:
        Calculate the total value on each platform
---------------------------------------------------------*/
function calcPlatformData(scoin_list) {
    let all_platforms = [];
    let mcap_sum = 0;

    /*----------------------------------------------------
    Loop each coin
    ----------------------------------------------------*/
    scoin_list.forEach((scoin) => {
        /*----------------------------------------------------
        Verify current coin has valid platform(s)
        ----------------------------------------------------*/
        if (!Array.isArray(scoin.platforms)) {
            console.error(`Problem with platforms of ${scoin.name}`);
            return;
        }

        /*----------------------------------------------------
        loop each platform for this coin
        ----------------------------------------------------*/
        scoin.platforms.forEach((pltfm) => {
            console.debug(`${scoin.name} on ${pltfm.name}: ${pltfm.total_supply}`);

            /*----------------------------------------------------
            calculate the market cap of this coin on this platform
            ----------------------------------------------------*/
            let mcap_on_pltfm = 0;
            if (scoin.platforms.length == 1) mcap_on_pltfm = scoin.main.circulating_mcap;
            else if (scoin.main.price) mcap_on_pltfm = pltfm.circulating_supply * scoin.main.price;
            else
                mcap_on_pltfm = (pltfm.circulating_supply / scoin.scw.circulating_supply) * scoin.main.circulating_mcap;
            if (!mcap_on_pltfm) mcap_on_pltfm = 0;

            mcap_sum += mcap_on_pltfm;

            /*----------------------------------------------------
            check if the current coin's platform is already in 
            our global data
            ----------------------------------------------------*/
            let gbl_pltfm = all_platforms.find((p) => p.name == pltfm.name);

            if (gbl_pltfm) {
                gbl_pltfm.mcap_sum += mcap_on_pltfm;
            } else {
                all_platforms.push({
                    name: pltfm.name,
                    mcap_sum: mcap_on_pltfm,
                    uri: pltfm.name.replace(' ', '_'),
                });
            } // if-else
        }); // for each platform
    }); // for each scoin

    if (DATA.metrics.totalMCap - mcap_sum > 1000000) {
        console.warn('Total market cap on all platforms != total market cap on all coins');
        all_platforms.push({
            name: 'Other / Unknown',
            mcap_sum: DATA.totalMCap - mcap_sum,
        });
    }

    /*----------------------------------------------------
    Sort platform list
    ----------------------------------------------------*/
    all_platforms.sort(util.sortObjByNumProperty('mcap_sum'));

    /*----------------------------------------------------
    Add string representatoin of supply on platform
    ----------------------------------------------------*/
    all_platforms.forEach((pltfm) => {
        pltfm.mcap_sum_s = util.toDollarString(pltfm.mcap_sum);
    });

    /*----------------------------------------------------
    Return the new platform data
    ----------------------------------------------------*/
    return all_platforms;
} // calcPlatformData()

/*---------------------------------------------------------
Function:
        calcMetrics
Description:
        Update the total volume and total market cap metrics
---------------------------------------------------------*/
function calcMetrics(coin_list) {
    let new_metrics = {
        totalMCap: 0,
        totalVolume: 0,
    };

    coin_list.forEach(async (scoin) => {
        if (scoin.main.circulating_mcap) new_metrics.totalMCap += scoin.main.circulating_mcap;
        if (scoin.main.volume) new_metrics.totalVolume += scoin.main.volume || 0;
    });

    new_metrics.totalMCap_s = util.toDollarString(new_metrics.totalMCap);
    new_metrics.totalVolume_s = util.toDollarString(new_metrics.totalVolume);

    return new_metrics;
} // calcMetrics()

/*---------------------------------------------------------
Function:
        update
Description:
        Update all coin and platform data globally
---------------------------------------------------------*/
async function update() {
    try {
        let coins = await fetchStablecoins();
        DATA.stablecoins = updateStablecoinData(coins, DATA.stablecoins);
        DATA.metrics = calcMetrics(DATA.stablecoins);
        DATA.platform_data = calcPlatformData(DATA.stablecoins);
        console.info('Data Updated.');
    } catch (e) {
        console.error(` ***CRITICAL*** Could not update data: ${e}`);
    }
} // update()

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
exports.start = start;
exports.data = DATA;
