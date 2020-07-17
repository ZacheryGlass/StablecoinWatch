const https = require('https');
const express = require('express');
const cron = require('node-cron');
const Web3 = require('web3');

const messari = require('./utils/messari');
const eth = require('./utils/eth');
const omni = require('./utils/omni');
const util = require('./utils/cmn');
const cmc = require('./utils/cmc');

// CONSTANTS
const MINS_BETWEEN_UPDATE = 5;
// const TETHER_DECIMALS = 6;
// const TETHER_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
// const TETHER_OMNI_ID = 31;
// const STABLY_DECIMALS = 6;
// const STABLY_CONTRACT_ADDRESS = '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe';

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

async function combinedCoins(msri_coins_list, cmc_coins_list) {
    const PLATFORMS = [
        { name: 'Ethereum', api: eth },
        { name: 'Bitcoin', api: omni },
        { name: 'EOS', api: null },
        { name: 'Tron', api: null },
    ];

    // loop through each messari coin
    // await Promise.all(
    // msri_coins_list.map(async (msri_coin) => {
    msri_coins_list.forEach(async (msri_coin) => {
        // for the current messari coin, check if the same coin
        // exists in the cmc coin list
        let cmc_coin = cmc_coins_list.find(
            (c) => c.symbol === msri_coin.symbol
        );
        if (cmc_coin) {
            // coin found in both Messari and CMC data. Combined the platform data
            PLATFORMS.forEach(async (pltfm) => {
                // For the final list, use Messari Platform data, but CMC contract address
                let msri_coin_pltfm = msri_coin.platforms.find(
                    (p) => p.name === pltfm.name
                );
                let cmc_coin_pltfm = cmc_coin.platforms.find(
                    (p) => p.name === pltfm.name
                );
                if (msri_coin_pltfm && cmc_coin_pltfm) {
                    msri_coin_pltfm.contract_address =
                        cmc_coin_pltfm.contract_address;
                    if (msri_coin_pltfm.contract_address) {
                        msri_coin_pltfm.supply = await pltfm.api.getTokenSupply(
                            msri_coin_pltfm.contract_address
                        );
                        // await util.sleep(200); // rate limited 5 calls/sec on Etherscan API.
                        console.log(
                            msri_coin.name,
                            msri_coin_pltfm.contract_address
                        );
                        console.log(msri_coin_pltfm.supply);
                    }
                }
            });
            cmc_coin.platforms = msri_coin.platforms;

            // For the final list, use Messari Platform data, but CMC contract address
            // let msri_eth_pltfm = msri_coin.platforms.find(
            //     (pltfm) => pltfm.name === 'Ethereum'
            // );
            // let cmc_eth_pltfm = cmc_coin.platforms.find(
            //     (pltfm) => pltfm.name === 'Ethereum'
            // );
            // if (msri_eth_pltfm && cmc_eth_pltfm) {
            //     msri_eth_pltfm.contract_address =
            //         cmc_eth_pltfm.contract_address;
            // }
            // cmc_coin.platforms = msri_coin.platforms;
            // pull Etherscan here
        } else {
            // coin found in Messari but not CMC data.
            console.log(
                `${msri_coin.symbol} found in Messari data but not CMC. Consider adding manual CMC ticker list.`
            );
            cmc_coin_list.push(msri_coin);
        }
    });
    return cmc_coins_list;
} // end coinbinedCoins()

async function updateData() {
    // pull new stablecoins data
    let fetching_msri = /*await*/ messari.getAllMessariStablecoins();
    let fetching_cmc = /*await*/ cmc.getCMCStablecoins(cmc.stablecoin_tickers);

    // combined data from multiple APIs
    let new_stablecoin_data = await Promise.all([
        fetching_msri,
        fetching_cmc,
    ]).then((scoins_arr) => {
        let msri_coins_list = scoins_arr[0];
        let cmc_coins_list = scoins_arr[1];

        return combinedCoins(msri_coins_list, cmc_coins_list);
        // set ret_list to the cmc coin list
        // let ret_coin_list = cmc_coins_list;

        // // loop through each messari coin
        // msri_coins_list.forEach((msri_coin) => {
        //     // for the current messari coin, check if the same coin
        //     // exists in the cmc coin list
        //     let ret_coin = ret_coin_list.find(
        //         (c) => c.symbol === msri_coin.symbol
        //     );
        //     if (ret_coin) {
        //         // coin found in both Messari and CMC data. Combined the platform data

        //         // For the final list, use Messari Platform data, but CMC contract address
        //         let msri_eth_pltfm = msri_coin.platforms.find(
        //             (pltfm) => pltfm.name === 'Ethereum'
        //         );
        //         let cmc_eth_pltfm = ret_coin.platforms.find(
        //             (pltfm) => pltfm.name === 'Ethereum'
        //         );
        //         if (msri_eth_pltfm && cmc_eth_pltfm) {
        //             msri_eth_pltfm.contract_address =
        //                 cmc_eth_pltfm.contract_address;
        //         }
        //         ret_coin.platforms = msri_coin.platforms;
        //         // pull Etherscan here
        //     } else {
        //         // coin found in Messari but not CMC data.
        //         console.log(
        //             `${msri_coin.symbol} found in Messari data but not CMC. Consider adding manual CMC ticker list.`
        //         );
        //         ret_coin_list.push(msri_coin);
        //     }
        // }); // end for each messari coin
        // return ret_coin_list;
    });

    // update global stablecoin data with newly pulled Messari data
    new_stablecoin_data.forEach((scoin_temp) => {
        // console.log(scoin_temp.name, scoin_temp.platforms);

        let scoin_temp_found = false;

        glb_stablecoins.forEach((scoin) => {
            if (scoin.symbol == scoin_temp.symbol) {
                scoin_temp_found = true;
                // new data found
                // replace scoin with scoin_temp in glb_stablecoins list
                var index = glb_stablecoins.indexOf(scoin);

                if (index !== -1) {
                    glb_stablecoins[index] = scoin_temp;
                }
            }
        });

        // new coin found in data that wasn't already in global stablecoins list.
        // Add new coin to global stablecoins list
        if (!scoin_temp_found) {
            glb_stablecoins.push(scoin_temp);
        }
    }); // end loop through new_stablecoin_data

    // reset global metrics
    totalMCap = 0;
    totalVolume = 0;
    glb_platform_data = [];

    // TODO: make this more general as to not require
    // explicitly listing the coins here.
    await Promise.all(
        glb_stablecoins.map(async (scoin) => {
            //         // update blockchain specific supply data for stablecoins which
            //         // have coins on multiple blockchains
            //         switch (scoin.symbol) {
            //             // Tether
            //             case 'USDT':
            //                 {
            //                     let eth_platform = scoin.platforms.find(
            //                         (pltfm) => pltfm.name === 'Ethereum'
            //                     );
            //                     let btc_platform = scoin.platforms.find(
            //                         (pltfm) => pltfm.name === 'Bitcoin'
            //                     );
            //                     let tron_platform = scoin.platforms.find(
            //                         (pltfm) => pltfm.name === 'Tron'
            //                     );

            //                     // update Tether on ETH supply
            //                     if (eth_platform) {
            //                         eth_platform.supply = await eth.getTokenSupply(
            //                             TETHER_CONTRACT_ADDRESS,
            //                             TETHER_DECIMALS
            //                         );
            //                     }
            //                     // update Tether on BTC supply
            //                     if (btc_platform) {
            //                         btc_platform.supply = await omni.getTokenSupply(
            //                             TETHER_OMNI_ID
            //                         );
            //                     }
            //                     // TODO: Pull TRON supply from API
            //                     // update Tether on TRON supply
            //                     if (tron_platform) {
            //                         tron_platform.supply =
            //                             scoin.mcap -
            //                             (btc_platform.supply + eth_platform.supply);
            //                     }
            //                 }
            //                 break;

            //             // Stably Dollar
            //             case 'USDS':
            //                 {
            //                     let eth_platform = scoin.platforms.find(
            //                         (pltfm) => pltfm.name === 'Ethereum'
            //                     );
            //                     let bnb_platform = scoin.platforms.find(
            //                         (pltfm) => pltfm.name === 'Binance Chain'
            //                     );
            //                     // update stably on ETH supply
            //                     if (eth_platform) {
            //                         eth_platform.supply = await eth.getTokenSupply(
            //                             STABLY_CONTRACT_ADDRESS,
            //                             STABLY_DECIMALS
            //                         );
            //                     }

            //                     // TODO: Pull BNB supply from API
            //                     // update stably on BNB supply
            //                     if (bnb_platform) {
            //                         bnb_platform.supply =
            //                             scoin.mcap - eth_platform.supply;
            //                     }
            //                 }
            //                 break;

            //             default:
            //                 //TODO: potential bug here if coins with multiple platforms
            //                 // is not listed explicitly above. Add better error handling
            //                 if (scoin.platforms.length != 1) {
            //                     console.log(
            //                         `ERROR: ${scoin.name} ON MULTIPLE PLATFORMS NOT ACCOUNTED FOR.`
            //                     );
            //                     scoin.platforms.forEach((platform) => {
            //                         platform.supply = null;
            //                     });
            //                 } else {
            //                     // TODO: use total supply instead of market cap here
            //                     scoin.platforms[0].supply = scoin.mcap;
            //                 }

            //                 break;
            //         } // end switch

            // populate glb_platform_data

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

    // sort global stablecoins list
    glb_stablecoins = glb_stablecoins.sort(function (a, b) {
        return b.mcap - a.mcap;
    });

    // add string representatoin of supply on platform
    glb_platform_data.forEach((pltfm) => {
        pltfm.scoin_total_s = util.toDollarString(pltfm.scoin_total);
    });
}

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
