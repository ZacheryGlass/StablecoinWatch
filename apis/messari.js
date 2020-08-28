/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const Messari = require('messari-api');
const MessariClient = new Messari();
const util = require('../util');
const Stablecoin = require('../classes/stablecoin');
const Platform = require('../classes/platform');

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function:
	getAllMessariStablecoins
Description:
	Fetch all stablecoins from Messari API
---------------------------------------------------------*/
exports.getAllMessariStablecoins = async () => {
    let ret_list = [];

    let response = await MessariClient.assets.all({ limit: 500 });
    allCoins = response.data.data;

    allCoins.forEach((coin) => {
        if (coin.profile.sector == 'Stablecoins' && !global.EXCLUDE_COINS.includes(coin.symbol)) {
            let platforms = [];

            try {
                let token_types = coin.profile.token_details.type.split(', ');
                token_types.forEach((token_type) => {
                    let platform_name = util.getTokenPlatform(token_type);
                    if (platform_name == 'Native') platform_name = coin.name;
                    platforms.push(new Platform(platform_name));
                });
            } catch {
                console.warn(`Fail to get platforms for Messari coin: ${coin.name}`);
            }

            let scoin = new Stablecoin();
            scoin.name = coin.name;
            scoin.symbol = coin.symbol;
            scoin.platforms = platforms;
            scoin.msri.desc = coin.profile.overview;
            scoin.msri.price = coin.metrics.market_data.price_usd ? coin.metrics.market_data.price_usd : null;
            scoin.msri.mcap = coin.metrics.marketcap.current_marketcap_usd;
            scoin.msri.volume = coin.metrics.market_data.real_volume_last_24_hours;
            scoin.cmc.circulating_supply = coin.metrics.supply.circulating;
            ret_list.push(scoin);
        } // if is stablecoin
    }); // for each

    return ret_list;
}; // getAllMessariStablecoins()
