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
Function:
        combineCoins
Description:
        Combine the data from mutlipe sources into a
        a single Stablecoin object.
---------------------------------------------------------*/
function combineCoins(msri_coins_list, cmc_coins_list, scw_coins_list) {
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

    /*----------------------------------------------------
    Check for coins that exist in SCW data but not CMC
    if found, push to cmc_coins_list
    ----------------------------------------------------*/
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
    /*----------------------------------------------------
    Pull new stablecoins data
    ----------------------------------------------------*/
    let fetching_msri = messari.getAllMessariStablecoins();
    let fetching_cmc = cmc.getAllCMCStablecoins();
    let fetching_scw = scw.getSCWStablecoins();

    /*----------------------------------------------------
    Combined data from multiple APIs
    ----------------------------------------------------*/
    return Promise.all([fetching_msri, fetching_cmc, fetching_scw])
        .then(async (scoins_arr) => {
            let msri_coins_list = scoins_arr[0];
            let cmc_coins_list = scoins_arr[1];
            let scw_coins_list = scoins_arr[2];

            let ret_list = combineCoins(msri_coins_list, cmc_coins_list, scw_coins_list);

            /*----------------------------------------------------
            Update the platform-specific supply for each coin
            ----------------------------------------------------*/
            await Promise.all(ret_list.map(async (coin) => coin.updateDerivedMetrics()));
            return ret_list;
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
        if (old_coin) old_coin = cur_new_coin;
        else old_coin_list.push(cur_new_coin);
    }); // end loop through new_coin_list

    /*----------------------------------------------------
    Sort the stablecoins list
    ----------------------------------------------------*/
    old_coin_list.sort((a, b) => b.main.mcap - a.main.mcap);

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
    let mcap_total = 0;

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
            console.debug(`${scoin.name} on ${pltfm.name}: ${pltfm.supply}`);

            /*----------------------------------------------------
            calculate the market cap of this coinon this platform
            ----------------------------------------------------*/
            let mcap_on_pltfm = 0;
            if (scoin.platforms.length == 1) mcap_on_pltfm = scoin.main.mcap;
            else if (scoin.main.price) mcap_on_pltfm = pltfm.supply * scoin.main.price;
            else mcap_on_pltfm = (pltfm.supply / scoin.scw.total_supply) * scoin.main.mcap;
            if (!mcap_on_pltfm) mcap_on_pltfm = 0;

            mcap_total += mcap_on_pltfm;

            /*----------------------------------------------------
            check if the current coin's platform is already in 
            our global data
            ----------------------------------------------------*/
            let gbl_pltfm = all_platforms.find((p) => p.name == pltfm.name);

            if (gbl_pltfm) {
                gbl_pltfm.total_mcap += mcap_on_pltfm;
            } else {
                all_platforms.push({
                    name: pltfm.name,
                    total_mcap: mcap_on_pltfm,
                    uri: pltfm.name.replace(' ', '_'),
                });
            } // if-else
        }); // for each platform
    }); // for each scoin

    if (DATA.totalMCap - mcap_total > 1000000)
        all_platforms.push({
            name: 'Other / Unknown',
            total_mcap: DATA.totalMCap - mcap_total,
        });

    /*----------------------------------------------------
    Sort platform list
    ----------------------------------------------------*/
    all_platforms = all_platforms.sort(function (a, b) {
        return b.total_mcap - a.total_mcap;
    });

    /*----------------------------------------------------
    Add string representatoin of supply on platform
    ----------------------------------------------------*/
    all_platforms.forEach((pltfm) => {
        pltfm.total_mcap_s = util.toDollarString(pltfm.total_mcap);
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
        if (scoin.main.mcap) new_metrics.totalMCap += scoin.main.mcap;
        if (scoin.main.volume) new_metrics.totalVolume += scoin.main.volume;
    });

    new_metrics.totalMCap_s = util.toDollarString(new_metrics.totalMCap);
    new_metrics.totalVolume_s = util.toDollarString(new_metrics.totalVolume);

    return new_metrics;
} // calcMetrics()

/*---------------------------------------------------------
Function:
        updateData
Description:
        Update all coin and platform data globally
---------------------------------------------------------*/
async function updateData() {
    try {
        let coins = await fetchStablecoins();
        DATA.stablecoins = updateStablecoinData(coins, DATA.stablecoins);
        DATA.metrics = calcMetrics(DATA.stablecoins);
        DATA.platform_data = calcPlatformData(DATA.stablecoins);
        console.info('Data Updated.');
    } catch (e) {
        console.error(` ***CRITICAL*** Could not update data: ${e}`);
    }
} // updateData()

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
exports.updateData = updateData;
exports.data = DATA;
