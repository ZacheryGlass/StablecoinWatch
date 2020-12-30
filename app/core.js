/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const util = require('./util');
const cron = require('node-cron');
const { CoinGecko, CoinMarketCap, Messari, StablecoinWatch } = require('../interface/datasource');

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
let INTF = new Map(); 
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
    INTF.set( 'CoinMarketCap',   new CoinMarketCap(60 * 12) ); // 12 hours
    INTF.set( 'Messari',         new Messari(15)            ); // 15 mins
    INTF.set( 'StablecoinWatch', new StablecoinWatch(60)    ); // 1 hour
    INTF.set( 'CoinGecko',       new CoinGecko(60)          ); // 1 hour 

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
        combineCoinLists
Description:
        Combine the data from mutlipe sources into a
        a single Stablecoin object.
Note:   This function takes Map object. That is, (key, value)
        pairs of which they *key* is the datasource name
        and the *value* is an array of Stablecoin Objects.
TODO:   When building the final combined list of stablecoins, 
        this function will only add coins from the first array
        in the map, or present in the 'StablecoinWatch' array.
        Coins that exist in the second coin_list but not the first
        will not be added to the final return array. This should
        be reconsidered.
---------------------------------------------------------*/
async function combineCoinLists(coin_lists_map) {

    let first_datasource = true;
    let final_coins_list;
    
    // loop through each datasource
    for (const [datasource, coin_list] of coin_lists_map) {
        
        if(first_datasource == true) {
            first_datasource = false;
            final_coins_list = coin_list;
            continue;
        }

        final_coins_list.forEach((final_coin) => {
            /*----------------------------------------------------
            for each the coin in the final coin list, check if that
            coin is found in the current datasource's coin list
            ----------------------------------------------------*/
            let cur_coin = coin_list.find((c) => c.symbol === final_coin.symbol);

            if (cur_coin) {
                /*----------------------------------------------------
                if the same coin symbol is found in the list of coins
                from this datasource, add the data from this
                datasource into the final coin from final_coins_list
                ----------------------------------------------------*/
                final_coin[datasource] = cur_coin[datasource];

                /*----------------------------------------------------
                check if the coin data from this datasource contains 
                any platforms that are not already in the final coin
                ----------------------------------------------------*/
                cur_coin.platforms.forEach((cur_pltfm) => {
                    
                    let final_pltfm = final_coin.platforms.find((p) => p.name === cur_pltfm.name);

                    if (final_pltfm && datasource == 'StablecoinWatch') {
                        /*------------------------------------------------------
                        Same platform found in final coin data and current 
                        datasouce data for this coin. 
                        We track contract addresses and exclude addresses 
                        (for circulating supply) locally. If the datasource is
                        this application "StablecoinWatch", add this locally
                        tracked info to this coin's platform data. 
                        ------------------------------------------------------*/
                        if (cur_pltfm.contract_address)  final_pltfm.contract_address  = cur_pltfm.contract_address;
                        if (cur_pltfm.exclude_addresses) final_pltfm.exclude_addresses = cur_pltfm.exclude_addresses;
                        if (cur_pltfm.total_supply)      final_pltfm.total_supply      = cur_pltfm.total_supply;
                    } else if( !final_pltfm ) {
                        /*------------------------------------------------------
                        Platform found in current datasource info for this coin,
                        but not in our final coin info. So add the new platform
                        to final coin data.
                        ------------------------------------------------------*/
                        final_coin.platforms.push(cur_pltfm);
                    }
                });
            } // if (cur_coin)
        }); // for each final_coin_list

        /*----------------------------------------------------
        Check for coins that exist in local data but not the
        combined coin list. if found, push to final_coins_list
        ----------------------------------------------------*/
        if(datasource == 'StablecoinWatch') {
            coin_list.forEach((scwcoin) => {
                let final_coin = final_coins_list.find((c) => c.symbol === scwcoin.symbol);
                if (!final_coin) final_coins_list.push(scwcoin);
            });
        }
    } /* for coin_lists_map */

    /*----------------------------------------------------
    Update the platform-specific supply data for each coin
    and return the coin list
    ----------------------------------------------------*/
    return Promise.all(final_coins_list.map(async (coin) => coin.updateDerivedMetrics()));
} // end combineCoinLists()

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
async function fetchStablecoins(datasource_map) {
    /*----------------------------------------------------
    Pull new stablecoins data
    ----------------------------------------------------*/
    let datasource_promises = [];
    let datasource_names = [];

    for (const [datasource_name, datasource_api] of datasource_map) {
        // each datasource api should implement getStableCoins()
        // TODO: add a check here to make sure the function is
        // supported before calling it below
        // NOTE: getStableCoins() is async, it returns a promise so
        // we must wait on all the promises before continuing.
        datasource_names.push( datasource_name );
        datasource_promises.push( datasource_api.getStablecoins() );
      }

    /*----------------------------------------------------
    Combined data from multiple datasources
    ----------------------------------------------------*/
    return Promise.all(datasource_promises)
        .then((datasource_coins_list) => {
            // assert scoins_arr.length == datasource_names.length
            let coin_lists = new Map();
            for( let i = 0; i < datasource_names.length; i++) {
                coin_lists.set( datasource_names[i], datasource_coins_list[i] );
            }
            return combineCoinLists(coin_lists);
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
        let coins = await fetchStablecoins(INTF);
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
