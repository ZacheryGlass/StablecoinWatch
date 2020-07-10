const keys = require('../keys');
const CoinMarketCap = require('coinmarketcap-api');
const cmc_api = new CoinMarketCap(keys.cmc);

// cannot pull from API bc CMC has non-stablecoins listed
// as stablecoins in API response.
let cmc_ticker_list = [
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

exports.getCMCStablecoins = () => {
    let ret_list = [];
    cmc_api
        .getTickers({ limit: 1000 })
        .then(async (resp) => {
            resp.data.forEach((coin) => {
                if (coin.tags.includes('stablecoin-asset-backed')) {
                    console.log(coin);
                    ret_list.push(coin);
                }
            });
        })
        .catch((err) => {
            console.log('ERROR: ', err);
            ret_list = null;
        });
    return ret_list;
}; // getCMCStablecoins()

exports.pullCMC = async () => {
    let ticker_list = cmc_ticker_list;
    var coin_list = [];
    await cmc_api
        .getMetadata({ symbol: ticker_list })
        .then(async (resp) => {
            if (resp.status.error_code) {
                console.log('CMC API ERROR CODE: ', resp.status.error_code);
                console.log('CMC API ERROR TIME: ', resp.status.timestamp);
                console.log('CMC API ERROR MSG: ', resp.status.error_message);
                return;
            }

            Object.keys(resp.data).forEach(function (key, i) {
                // console.log(resp.data[key]);
                coin_list.push(resp.data[key]);
                // index: the ordinal position of the key within the object
            });
        })
        .catch((err) => {
            console.log('CMC API ERROR: ', err);
        });
    console.log(coin_list.length);
    return coin_list;
}; //pullCMC()
