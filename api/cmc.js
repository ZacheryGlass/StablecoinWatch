const keys = require('../keys');
const CoinMarketCap = require('coinmarketcap-api');
const cmc_api = new CoinMarketCap(keys.cmc);
const Stablecoin = require('../stablecoin');
const Platform = require('../platform');
const { cmc } = require('../keys');
const { sleep, toDollarString } = require('../util');
const cron = require('node-cron');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 60 * 8; /* 8 hours */
const DEBUGING = true;
// CMC API will list some coins as Stablecoins that are
// not actually stablecoins. Manually exclude these mistakes.
const ADDITIONAL_COINS = ['DAI', 'AMPL', 'SUSD'];
const DEBUG_COIN_LIST = [
    'USDT',
    'USDC',
    'AMPL',
    'DAI',
    'PAX',
    'TUSD',
    'BUSD',
    'HUSD',
    'EURS',
    'USDK',
    'SUSD',
    'GUSD',
    'DGX',
    'SBD',
    'USDQ',
    'XCHF',
    'BITCNY',
    'XAUR',
    'IDRT',
    'EOSDT',
    'CONST',
    'BITUSD',
    'XPD',
    'USDS',
    'HGT',
    'BITEUR',
    'ITL',
    'BITGOLD',
    'XEUR',
    '1GOLD',
    'CNHT',
    'XAUT',
];

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
let glb_cmc_tickers = [];

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
        throw `CMC API ERROR ${code}: ${msg}`;
    }
} // end cmcCheckError()

/*---------------------------------------------------------
Function:
        buildCMCStablecoinList
Description:
        This pulls the CoinMarketCap API to build a list of
        Stablecoins.
---------------------------------------------------------*/
async function buildCMCStablecoinList() {
    if (global.DEBUG) {
        glb_cmc_tickers = DEBUG_COIN_LIST;
        return;
    }

    glb_cmc_tickers = ADDITIONAL_COINS;

    return cmc_api
        .getTickers({ limit: 3000 })
        .then((resp) => {
            console.info('Built CMC Coin List');
            cmcCheckError(resp.status);
            resp.data.forEach((coin) => {
                if (
                    (coin.tags.includes('stablecoin-asset-backed') || coin.tags.includes('stablecoin')) &&
                    !global.EXCLUDE_COINS.includes(coin.symbol)
                ) {
                    glb_cmc_tickers.push(coin.symbol);
                }
            });
        })
        .catch((err) => {
            console.error(err);
        });
} // buildCMCStablecoinList()

/*---------------------------------------------------------
Function:
        cmc.getCMCStablecoins()
Description:
        This function returns all coins listed as stablecoins
        on CoinMarketCap API.
Note:   This includes coins pegged to assets other than the
        US Dollar, but oddly does not some coins such as DAI
---------------------------------------------------------*/
exports.getAllCMCStablecoins = async () => {
    if (!glb_cmc_tickers || glb_cmc_tickers.length == 0) {
        await buildCMCStablecoinList();
    }
    return exports.getCMCStablecoins(glb_cmc_tickers);
}; // end getCMCStablecoins()

/*---------------------------------------------------------
Function:
        cmc.getCMCStablecoins()
Description:
        Get a list of Stablecoin Objects from a list of tickers
---------------------------------------------------------*/
exports.getCMCStablecoins = async (ticker_list) => {
    let fetching_metadata = cmc_api.getMetadata({ symbol: ticker_list });
    let fetching_quote = cmc_api.getQuotes({ symbol: ticker_list });

    return Promise.all([fetching_metadata, fetching_quote]).then(
        async (scoins_arr) => {
            let metadata_resp = scoins_arr[0];
            let quote_resp = scoins_arr[1];
            cmcCheckError(metadata_resp.status);
            cmcCheckError(quote_resp.status);

            // build return list
            let coin_list_ret = [];
            Object.keys(metadata_resp.data).forEach(function (key, i) {
                let md = metadata_resp.data[key];
                let q = {};

                if (quote_resp.data.hasOwnProperty(key)) q = quote_resp.data[key];

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
                scoin.cmc.desc = md.description;
                scoin.cmc.mcap = q.quote ? q.quote.USD.market_cap : null;
                scoin.cmc.mcap_s = toDollarString(scoin.cmc.mcap);
                scoin.cmc.volume = q.quote ? q.quote.USD.volume_24h : null;
                scoin.cmc.volume_s = toDollarString(scoin.cmc.volume);
                scoin.img_url = md.logo;
                scoin.cmc.price = q.quote ? q.quote.USD.price.toFixed(3) : null;
                scoin.cmc.total_supply = q.total_supply;
                scoin.cmc.circulating_supply = q.circulating_supply;

                coin_list_ret.push(scoin);
            });
            return coin_list_ret;
        } // then
    );
}; // end getCMCStablecoins()
