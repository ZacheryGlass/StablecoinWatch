const Messari = require('messari-api');
const MessariClient = new Messari();
const util = require('./cmn');
const util = require('./cmn');

exports.getMessariStablecoins = async function getMessariStablecoins() {
    let ret_list = [];

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    allCoins.forEach((coin) => {
        if (coin.profile.sector != 'Stablecoins') return;
        ret_list.push(
            new Stablecoin(
                coin.name,
                coin.symbol,
                coin.profile.token_details.type,
                coin.profile.overview,
                coin.metrics.marketcap.current_marketcap_usd,
                coin.metrics.market_data.real_volume_last_24_hours
            )
        );
    }); // for each

    return ret_list;
}; // getMessariStablecoins()
