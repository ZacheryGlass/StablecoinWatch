const Messari = require('messari-api');
const MessariClient = new Messari();
const util = require('../util');
const Stablecoin = require('../stablecoin');
const Platform = require('../platform');

exports.getAllMessariStablecoins = async () => {
    let ret_list = [];

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    allCoins.forEach((coin) => {
        if (coin.profile.sector == 'Stablecoins') {
            // format platforms
            let platforms = [];

            try {
                let token_types = coin.profile.token_details.type.split(', ');
                token_types.forEach((token_type) => {
                    let platform_name = util.getTokenPlatform(token_type);
                    if (platform_name == 'Native') platform_name = coin.name;
                    platforms.push(new Platform(platform_name));
                });
            } catch {
                console.log(`Error getting platforms for Messari coin: ${coin.name}`);
            }

            let scoin = new Stablecoin();
            scoin.name = coin.name;
            scoin.symbol = coin.symbol;
            scoin.platforms = platforms;
            scoin.msri.desc = coin.profile.overview;
            scoin.msri.mcap = coin.metrics.marketcap.current_marketcap_usd;
            scoin.msri.volume = coin.metrics.market_data.volume_last_24_hours;
            ret_list.push(scoin);
        } // if is stablecoin
    }); // for each

    return ret_list;
}; // getAllMessariStablecoins()
