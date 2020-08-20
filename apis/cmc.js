const keys = require('../keys');
const CoinMarketCap = require('coinmarketcap-api');
const cmc_api = new CoinMarketCap(keys.cmc);
const Coin = require('../classes/coin');
const Platform = require('../classes/platform');
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
let gbl_all_cmc_coin_data;
let gbl_all_cmc_metadata;
let glb_cmc_coins_initialized = false;

/*---------------------------------------------------------
    SCHEDULED TASKS
---------------------------------------------------------*/
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, buildCmcCoinList);

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
        buildCmcCoinList
Description:
        This function fetches all coins from the CoinMarketCap
        API and saves to 'gbl_all_cmc_coin_data'
---------------------------------------------------------*/
async function buildCmcCoinList() {
    let limit = 2000;

    if (global.DEBUG) limit = 200; // don't waste cmc api credits

    gbl_all_cmc_coin_data = await cmc_api
        .getTickers({ limit: limit })
        .then((resp) => {
            if (!cmcCheckError(resp.status)) return;
            return resp.data;
        })
        .catch((err) => {
            console.error(`Could not fetch CMC API: ${err}`);
        });

    glb_cmc_coins_initialized = true;
    return;
} // buildCmcCoinList()

/*---------------------------------------------------------
Function:
        cmc.getAllCmcCoins()
Description:
        This function returns all coins from CoinMarketCap API.
---------------------------------------------------------*/
exports.getAllCmcCoins = async () => {
    if (!glb_cmc_coins_initialized) await buildCmcCoinList();

    let coin_list_ret = [];

    Object.keys(gbl_all_cmc_coin_data).forEach(function (key, i) {
        let md = gbl_all_cmc_coin_data[key];

        let scoin = new Coin();
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
    return coin_list_ret;
}; // end getCmcCoins()
