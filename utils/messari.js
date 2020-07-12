const Messari = require('messari-api');
const MessariClient = new Messari();
const util = require('./cmn');
const { Stablecoin, MessariCoin } = require('../stablecoin');
const Platform = require('../platform');

exports.getAllMessariStablecoins = async () => {
    let ret_list = [];

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    allCoins.forEach((coin) => {
        if (coin.profile.sector == 'Stablecoins') {
            // format platforms
            let token_types = coin.profile.token_details.type.split(', ');
            let platforms = [];
            token_types.forEach((token_type) => {
                let platform_name = util.getTokenPlatform(token_type);
                if (platform_name == 'Native') platform_name = coin.name;
                platforms.push(new Platform(platform_name));
            });
            // format description
            let descrip = coin.profile.overview;
            if (!descrip) descrip = 'No description available.';

            let scoin = new Stablecoin(
                null,
                new MessariCoin(
                    /* name         */ coin.name,
                    /* symbol       */ coin.symbol,
                    /* platforms    */ platforms,
                    /* desc         */ descrip,
                    /* mcap         */ coin.metrics.marketcap.current_marketcap_usd,
                    // /* volume       */ coin.metrics.market_data.volume_last_24_hours,
                    /* volume       */ coin.metrics.market_data.real_volume_last_24_hours
                )
            );
            ret_list.push(scoin);
        }
    }); // for each

    return ret_list;
}; // getAllMessariStablecoins()
