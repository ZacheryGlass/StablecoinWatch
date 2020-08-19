const keys = require('../keys');
const CoinMarketCap = require('coinmarketcap-api');
const cmc_api = new CoinMarketCap(keys.cmc);
const Stablecoin = require('../stablecoin');
const Platform = require('../platform');
const { cmc } = require('../keys');
const { urlify, toDollarString } = require('../util');
const cron = require('node-cron');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 60 * 12; /* 12 hours */

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
let glb_cmc_tickers = [];
let gbl_all_cmc_data;
let glb_cmc_initialized = false;

/*---------------------------------------------------------
    SCHEDULED TASKS
---------------------------------------------------------*/
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, buildCMCStablecoinList);

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function:
        cmcCheckError
Description:
        Checks the return status of an CoinMarketCap API
        reponse to see if an error code was set.
---------------------------------------------------------*/
function cmcCheckError(status) {
    console.info(`${status.timestamp}: Used ${status.credit_count} CMC Credits`);

    if (status.error_code) {
        let code = status.error_code;
        let msg = status.error_message;
        console.error(`CMC API ERROR ${code}: ${msg}`);
        return false;
    }
    return true;
} // end cmcCheckError()

/*---------------------------------------------------------
Function:
        buildCMCStablecoinList
Description:
        This pulls the CoinMarketCap API to build a list of
        Stablecoins, as defined by CMC.
---------------------------------------------------------*/
async function buildCMCStablecoinList() {
    // CMC doesn't tag all stablecoins correctly so forcefully add to list here
    // coins that are on CMC but not tagged as stablecoins
    // glb_cmc_tickers = ['DAI', 'AMPL', 'SUSD', 'XAUT', 'USDT'];
    let limit = 2000;
    if (global.DEBUG) limit = 200; // don't waste cmc api credits

    gbl_all_cmc_data = await cmc_api
        .getTickers({ limit: limit })
        .then((resp) => {
            if (!cmcCheckError(resp.status)) return;
            return resp.data;
        })
        .catch((err) => {
            console.error(`Could not fetch CMC API: ${err}`);
        });
    console.debug('gbl_all_cmc_data.length', gbl_all_cmc_data.length);
    glb_cmc_initialized = true;
    return;
} // buildCMCStablecoinList()

/*---------------------------------------------------------
Function:
        cmc.getAllCMCStablecoins()
Description:
        This function returns all coins listed as stablecoins
        on CoinMarketCap API.
Note:   This includes coins pegged to assets other than the
        US Dollar, but oddly does not some coins such as DAI
---------------------------------------------------------*/
exports.getAllCMCStablecoins = async () => {
    await buildCMCStablecoinList();
    return exports.getCMCStablecoins();
}; // end getAllCMCStablecoins()

/*---------------------------------------------------------
Function:
        cmc.getCMCStablecoins()
Description:
        Get a list of Stablecoin Objects from a list of tickers
---------------------------------------------------------*/
exports.getCMCStablecoins = async () => {
    // build ticker list from CMC data
    // gbl_all_cmc_data.forEach(function (coin) {
    //     if(coin.symbol) glb_cmc_tickers.push(coin.symbol);
    // });

    // let fetching_metadata = cmc_api.getMetadata({ symbol: glb_cmc_tickers });
    // let fetching_quote = cmc_api.getQuotes({ symbol: glb_cmc_tickers });

    // return Promise.all([fetching_metadata, fetching_quote]).then(
    // async (scoins_arr) => {
    // let metadata_resp = scoins_arr[0];
    // let quote_resp = scoins_arr[1];
    // cmcCheckError(metadata_resp.status);
    // cmcCheckError(quote_resp.status);

    // build return list
    let coin_list_ret = [];
    Object.keys(gbl_all_cmc_data).forEach(function (key, i) {
        let q = {};

        let md = gbl_all_cmc_data[key];

        // if (gbl_all_cmc_data.hasOwnProperty(key)) q = quote_resp.data[key];

        let scoin = new Stablecoin();
        scoin.name = md.name;
        scoin.symbol = md.symbol;
        scoin.platforms = md.platform
            ? [
                  new Platform(
                      md.platform.name == 'Binance Coin' ? 'BNB Chain' : md.platform.name,
                      md.platform.token_address,
                      null // platform total supply - fetched from Blockchain
                  ),
              ]
            : [new Platform(md.name)];
        // scoin.cmc.desc = urlify(md.description);
        scoin.cmc.mcap = md.quote ? md.quote.USD.market_cap : null;
        scoin.cmc.mcap_s = toDollarString(scoin.cmc.mcap);
        scoin.cmc.volume = md.quote ? md.quote.USD.volume_24h : null;
        scoin.cmc.volume_s = toDollarString(scoin.cmc.volume);
        // scoin.img_url = md.logo;
        scoin.cmc.price = md.quote ? md.quote.USD.price.toFixed(3) : null;
        scoin.cmc.total_supply = md.total_supply;
        scoin.cmc.circulating_supply = md.circulating_supply;

        coin_list_ret.push(scoin);
    });
    // console.debug(coin_list_ret.length);
    return coin_list_ret;
    //     } // then
    // );
}; // end getCMCStablecoins()
