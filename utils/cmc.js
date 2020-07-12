const keys = require('../keys');
const CoinMarketCap = require('coinmarketcap-api');
const Stablecoin = require('../stablecoin');
const Platform = require('../platform');
const { cmc } = require('../keys');
const { sleep, toDollarString } = require('./cmn');
const cmc_api = new CoinMarketCap(keys.cmc);

function cmcCheckError(status) {
    if (status.error_code) {
        let code = status.error_code;
        let msg = status.error_message;
        // console.log('CMC API ERROR CODE: ', code);
        // console.log('CMC API ERROR MSG: ', msg);
        throw `CMC API ERROR ${code}: ${msg}`;
    }
} // end cmcCheckError()

exports.stablecoin_tickers = [
    'USDT',
    'USDC',
    'PAX',
    'BUSD',
    'TUSD',
    'HUSD',
    'DAI',
    'LUNA',
    'RSR',
    'EURS',
    'SUSD',
    'GUSD',
    'SBD',
    'USDS',
    'USDK',
    'USDQ',
    'EOSDT',
];

// This function returns all coins listed as stablecoins on CoinMarketCap
// NOTE: This includes coins pegged to assets other than the US Dollar,
// and oddly does not include DAI
exports.getAllCMCStablecoins = async () => {
    // TODO: This function can be reduced to two API calles by using
    // using getTickers() and looping through each coin manually
    // rather than using getMetadata() in getCMCStablecoins()...
    // Make ticker_list option, default returns all CMCStablecois
    // so reduce to a single function.
    let ret_list = [];
    return cmc_api
        .getTickers({ limit: 1000 })
        .then((resp) => {
            resp.data.forEach((coin) => {
                if (coin.tags.includes('stablecoin-asset-backed')) {
                    ret_list.push(coin.symbol);
                }
            });
            return exports.getCMCStablecoins(ret_list);
        })
        .catch((err) => {
            console.log('ERROR: ', err);
        });
}; // end getCMCStablecoins()

// Get a list of Stablecoin Objects from a list of tickers
exports.getCMCStablecoins = async (ticker_list) => {
    // TODO: retreive metadata and quote asynchronously
    let metadata_resp = await cmc_api.getMetadata({ symbol: ticker_list });
    cmcCheckError(metadata_resp.status);

    let quote_resp = await cmc_api.getQuotes({ symbol: ticker_list });
    cmcCheckError(quote_resp.status);

    // build return list
    let coin_list_ret = [];
    Object.keys(metadata_resp.data).forEach(function (key, i) {
        let metadata = metadata_resp.data[key];
        let quote = null;
        if (quote_resp.data.hasOwnProperty(key)) {
            quote = quote_resp.data[key].quote;
        }

        let scoin = new Stablecoin(
            metadata.name,
            metadata.symbol,
            metadata.platform
                ? new Platform(
                      metadata.platform.name,
                      metadata.platform.token_addres,
                      0 // contract total supply - fetch from Etherscan
                  )
                : null,
            metadata.description,
            quote ? quote.USD.market_cap : null,
            quote ? quote.USD.volume_24h : null,
            metadata.logo
        );

        coin_list_ret.push(scoin);
        // TODO: return Promise.all()
    }); // for each (build return list)

    return coin_list_ret;
}; // end getCMCStablecoins()
