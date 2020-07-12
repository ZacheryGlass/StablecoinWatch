const https = require('https');
const express = require('express');
const cron = require('node-cron');

const messari = require('./utils/messari');
const etherscan = require('./utils/etherscan');
const omni = require('./utils/omni');
const util = require('./utils/cmn');
const cmc = require('./utils/cmc');

// CONSTANTS
const USE_CMC_ONLY = false;
const USE_MSRI_ONLY = true;
const MINS_BETWEEN_UPDATE = 5;
const TETHER_DECIMALS = 6;
const TETHER_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const TETHER_OMNI_ID = 31;
const STABLY_DECIMALS = 6;
const STABLY_CONTRACT_ADDRESS = '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe';

// GLOBAL VARS
let glb_stablecoins = [];
let totalMCap = 0;
let totalVolume = 0;
let glb_platform_data = [];

if (USE_MSRI_ONLY) data_src = 'msriData';
if (USE_CMC_ONLY) data_src = 'cmcData';

// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/res'));

updateData();
// cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

// TODO: make this more general as to not require
// explicitly listing the coins here.
// async function updatePlatforms(scoin, data_src) {
//     // update blockchain specific supply data for stablecoins which
//     // have coins on multiple blockchains
//     if (data_src != 'msriData' && data_src != 'cmcData')
//         throw `Unsupported data source: ${data_src}.`;

//     switch (scoin.symbol) {
//         // Tether
//         case 'USDT':
//             {
//                 let eth_platform = scoin[data_src].platforms.find(
//                     (pltfm) => pltfm.name === 'Ethereum'
//                 );
//                 let btc_platform = scoin[data_src].platforms.find(
//                     (pltfm) => pltfm.name === 'Bitcoin'
//                 );
//                 let tron_platform = scoin[data_src].platforms.find(
//                     (pltfm) => pltfm.name === 'Tron'
//                 );

//                 // update Tether on ETH supply
//                 if (eth_platform) {
//                     eth_platform.supply = await etherscan.getTokenSupply(
//                         TETHER_CONTRACT_ADDRESS,
//                         TETHER_DECIMALS
//                     );
//                 }
//                 // update Tether on BTC supply
//                 if (btc_platform) {
//                     btc_platform.supply = await omni.getTokenSupply(
//                         TETHER_OMNI_ID
//                     );
//                 }
//                 // TODO: Pull TRON supply from API
//                 // update Tether on TRON supply
//                 if (tron_platform) {
//                     tron_platform.supply =
//                         scoin[data_src].mcap -
//                         (btc_platform.supply + eth_platform.supply);
//                 }
//             }
//             break;

//         // Stably Dollar
//         case 'USDS':
//             {
//                 let eth_platform = scoin[data_src].platforms.find(
//                     (pltfm) => pltfm.name === 'Ethereum'
//                 );
//                 let bnb_platform = scoin[data_src].platforms.find(
//                     (pltfm) => pltfm.name === 'Binance Chain'
//                 );
//                 // update stably on ETH supply
//                 if (eth_platform) {
//                     eth_platform.supply = await etherscan.getTokenSupply(
//                         STABLY_CONTRACT_ADDRESS,
//                         STABLY_DECIMALS
//                     );
//                 }

//                 // TODO: Pull BNB supply from API
//                 // update stably on BNB supply
//                 if (bnb_platform) {
//                     bnb_platform.supply =
//                         scoin[data_src].mcap - eth_platform.supply;
//                 }
//             }
//             break;

//         default:
//             //TODO: potential bug here if coins with multiple platforms
//             // is not listed explicitly above. Add better error handling
//             if (scoin[data_src].platforms.length != 1) {
//                 console.log(
//                     `ERROR: ${scoin.name} ON MULTIPLE PLATFORMS NOT ACCOUNTED FOR.`
//                 );
//                 scoin[data_src].platforms.forEach((platform) => {
//                     platform.supply = null;
//                 });
//             } else {
//                 if (data_src == 'cmcData') {
//                     scoin[data_src].platforms[0].supply =
//                         scoin[data_src].circulating_supply;
//                 } else {
//                     // TODO: use supply instead of market cap here
//                     scoin[data_src].platforms[0].supply = scoin[data_src].mcap;
//                 }
//             }
//             break;
//     } // end switch
//     // console.log(scoin);
//     return scoin;
// }

async function updatePlatformsSupply(scoin) {
    if (scoin.cmcData && !scoin.msriData) {
        scoin.platforms = scoin.cmcData.platforms;
        scoin.platforms.forEach(async (platform) => {
            if (platform.name == 'Ethereum') {
                platform.supply = await etherscan.getTokenSupply(
                    platform.contract_address
                );
            } // end if
        }); // end forEach

        if (
            scoin.platforms.length == 1 &&
            scoin.platforms[0].name != 'Etheruem'
        ) {
            scoin.platforms[0].supply = scoin.circulating_supply;
        } // end if
    } else if (!scoin.cmcData && scoin.msriData) {
        scoin.platforms = scoin.msriData.platforms;
    } else if (scoin.cmcData && scoin.msriData) {
        scoin.platforms = scoin.msriData.platforms;

        scoin.platforms.forEach(async (platform) => {
            switch (platform.name) {
                case 'Ethereum':
                    platform.supply = await etherscan.getTokenSupply(
                        platform.contract_address
                    );
                    break;

                case 'Bitcoin':
                    platform.supply = await omni.getTokenSupply(TETHER_OMNI_ID);
                    break;

                default:
                    break;
            }
        }); // end forEach
    }
    return scoin;

    // switch (scoin.symbol) {
    //     // Tether
    //     case 'USDT':
    //         {
    //             let eth_platform = scoin[data_src].platforms.find(
    //                 (pltfm) => pltfm.name === 'Ethereum'
    //             );
    //             let btc_platform = scoin[data_src].platforms.find(
    //                 (pltfm) => pltfm.name === 'Bitcoin'
    //             );
    //             let tron_platform = scoin[data_src].platforms.find(
    //                 (pltfm) => pltfm.name === 'Tron'
    //             );

    //             // update Tether on ETH supply
    //             if (eth_platform) {
    //                 eth_platform.supply = await etherscan.getTokenSupply(
    //                     TETHER_CONTRACT_ADDRESS,
    //                     TETHER_DECIMALS
    //                 );
    //             }
    //             // update Tether on BTC supply
    //             if (btc_platform) {
    //                 btc_platform.supply = await omni.getTokenSupply(
    //                     TETHER_OMNI_ID
    //                 );
    //             }
    //             // TODO: Pull TRON supply from API
    //             // update Tether on TRON supply
    //             if (tron_platform) {
    //                 tron_platform.supply =
    //                     scoin[data_src].mcap -
    //                     (btc_platform.supply + eth_platform.supply);
    //             }
    //         }
    //         break;

    //     // Stably Dollar
    //     case 'USDS':
    //         {
    //             let eth_platform = scoin[data_src].platforms.find(
    //                 (pltfm) => pltfm.name === 'Ethereum'
    //             );
    //             let bnb_platform = scoin[data_src].platforms.find(
    //                 (pltfm) => pltfm.name === 'Binance Chain'
    //             );
    //             // update stably on ETH supply
    //             if (eth_platform) {
    //                 eth_platform.supply = await etherscan.getTokenSupply(
    //                     STABLY_CONTRACT_ADDRESS,
    //                     STABLY_DECIMALS
    //                 );
    //             }

    //             // TODO: Pull BNB supply from API
    //             // update stably on BNB supply
    //             if (bnb_platform) {
    //                 bnb_platform.supply =
    //                     scoin[data_src].mcap - eth_platform.supply;
    //             }
    //         }
    //         break;

    //     default:
    //         //TODO: potential bug here if coins with multiple platforms
    //         // is not listed explicitly above. Add better error handling
    //         if (scoin[data_src].platforms.length != 1) {
    //             console.log(
    //                 `ERROR: ${scoin.name} ON MULTIPLE PLATFORMS NOT ACCOUNTED FOR.`
    //             );
    //             scoin[data_src].platforms.forEach((platform) => {
    //                 platform.supply = null;
    //             });
    //         } else {
    //             if (data_src == 'cmcData') {
    //                 scoin[data_src].platforms[0].supply =
    //                     scoin[data_src].circulating_supply;
    //             } else {
    //                 // TODO: use supply instead of market cap here
    //                 scoin[data_src].platforms[0].supply =
    //                     scoin[data_src].mcap;
    //             }
    //         }
    //         break;
    // } // end switch
}

async function updateData() {
    // pull new stablecoins data
    let fetching_msri = await messari.getAllMessariStablecoins();
    let fetching_cmc = await cmc.getCMCStablecoins(cmc.stablecoin_tickers);

    // combined data from multiple APIs
    let new_stablecoin_data = await Promise.all([
        fetching_msri,
        fetching_cmc,
    ]).then((source_scoin_lists) => {
        let msri_stablecoins = source_scoin_lists[0];
        let cmc_stableconis = source_scoin_lists[1];

        if (USE_MSRI_ONLY) return msri_stablecoins;
        if (USE_CMC_ONLY) return cmc_stableconis;

        let ret_stablecoin_list = cmc_stableconis;

        ret_stablecoin_list.forEach((ret_scoin) => {
            let msri_scoin = msri_stablecoins.find(
                (coin) => coin.symbol === ret_scoin.symbol
            );
            if (msri_scoin) {
                ret_scoin.msriData = msri_scoin.msriData;
            }
        });

        return cmc_stableconis;
    });

    // update global stablecoin data with newly pulled Messari data
    new_stablecoin_data.forEach((scoin_temp) => {
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

    await Promise.all(
        glb_stablecoins.map(async (scoin) => {
            scoin = await updatePlatformsSupply(scoin);
            // populate glb_platform_data

            // loop through each platform for the current scoin
            scoin[data_src].platforms.forEach((cur_pltfm) => {
                // check if the current scoin's platform is already in our global data
                let gbl_pltfm = glb_platform_data.find(
                    (gbl_pltfm) => gbl_pltfm.name === cur_pltfm.name
                );

                if (gbl_pltfm) {
                    // if this platform is already in our global data (seen before)
                    // then sum the supply to the total
                    gbl_pltfm.scoin_total += cur_pltfm.supply;
                } else {
                    // if this scoin's platform is not in the global data,
                    // add the new platform to the global data
                    glb_platform_data.push({
                        name: cur_pltfm.name,
                        scoin_total: cur_pltfm.supply,
                    });
                } // end if-else
            }); // end for each

            // update global total data
            totalMCap += scoin[data_src].mcap;
            totalVolume += scoin[data_src].volume;
        })
    ); // end glb_stablecoins loop

    // sort global platform list
    glb_platform_data = glb_platform_data.sort(function (a, b) {
        return b.scoin_total - a.scoin_total;
    });

    // console.log(glb_stablecoins);
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
    // console.log(glb_platform_data);
    // console.log(glb_stablecoins);
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
