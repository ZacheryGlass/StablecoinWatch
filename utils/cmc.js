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
    // 'LUNA', -- not pegged to USD, but a basket of currencies
    'EURS',
    'SUSD',
    'GUSD',
    'SBD',
    'USDS',
    'USDK',
    'USDQ',
    'EOSDT',
    'AMPL',
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
    let fetching_metadata = cmc_api.getMetadata({ symbol: ticker_list });
    let fetching_quote = cmc_api.getQuotes({ symbol: ticker_list });

    return Promise.all([fetching_metadata, fetching_quote]).then(
        async (scoins_arr) => {
            let metadata_resp = scoins_arr[0];
            let quote_resp = scoins_arr[1];
            cmcCheckError(metadata_resp.status);
            cmcCheckError(metadata_resp.status);

            // build return list
            let coin_list_ret = [];
            Object.keys(metadata_resp.data).forEach(function (key, i) {
                let md = metadata_resp.data[key];
                let q = null;

                if (quote_resp.data.hasOwnProperty(key))
                    q = quote_resp.data[key];

                let scoin = new Stablecoin(
                    md.name,
                    md.symbol,
                    null,
                    md.platform
                        ? [
                              new Platform(
                                  md.platform.name,
                                  md.platform.token_address,
                                  null // platform total supply - fetched from Blockchain
                              ),
                          ]
                        : [new Platform(md.name, null, q.total_supply)],
                    md.description,
                    q.quote ? q.quote.USD.market_cap : null,
                    q.quote ? q.quote.USD.volume_24h : null,
                    md.logo,
                    q.quote ? q.quote.USD.price.toFixed(3) : null
                );

                coin_list_ret.push(scoin);
            });
            return coin_list_ret;
        } // then
    );
}; // end getCMCStablecoins()
