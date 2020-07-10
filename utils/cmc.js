const keys = require('../keys');
const CoinMarketCap = require('coinmarketcap-api');
const Stablecoin = require('../stablecoin');
const cmc_api = new CoinMarketCap(keys.cmc);

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

exports.pullCMC = async (ticker_list) => {
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
                coin = resp.data[key];
                coin_list.push( new Stablecoin(
                    name = coin.name,
                    symbol = coin.symbol,
                    platform = { 
                        name: platform.name,
                        contract_address: platform.token_addres,
                        supply: 0,
                    },
                    desc = coin.description,
                    mcap = null,
                    volume = null,
                    chain_supply = {},
                    img_url = coin.logo,
                ) );
            });
        })
        .catch((err) => {
            console.log('CMC API ERROR: ', err);
        });
    return coin_list;
}; //pullCMC()
