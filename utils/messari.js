const Messari = require('messari-api');
const MessariClient = new Messari();
const util = require('./cmn');

exports.getMessariStablecoins = async function getMessariStablecoins() {
    let ret_list = [];

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    allCoins.forEach((coin) => {
        if (coin.profile.sector == 'Stablecoins') {
            let scoin = {
                name: coin.name,
                symbol: coin.symbol,
                mcap_s: util.toDollarString(
                    coin.metrics.marketcap.current_marketcap_usd
                ),
                mcap: coin.metrics.marketcap.current_marketcap_usd,
                type: coin.profile.token_details.type,
                desc: coin.profile.overview
                    ? coin.profile.overview.replace(/<[^>]*>?/gm, '')
                    : 'No  description available.',
                volume_s: util.toDollarString(
                    coin.metrics.market_data.real_volume_last_24_hours
                ),
                volume: coin.metrics.market_data.real_volume_last_24_hours,
                chain_supply: {},
            };
            ret_list.push(scoin);
        }
    }); // for each

    return ret_list;
}; // getMessariStablecoins()
