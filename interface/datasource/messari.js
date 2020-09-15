/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const Messari = require('messari-api');
const { getTokenPlatform } = require('../../app/util');
const Stablecoin = require('../../models/stablecoin');
const Platform = require('../../models/platform');
const DataSourceInterface = require('./datasource_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class MessariInterface extends DataSourceInterface {
    client = null;

    /*---------------------------------------------------------
    Function:   constructor
    Description: call super class constructor
    ---------------------------------------------------------*/
    constructor(update_rate) {
        super(update_rate);
        this.client = new Messari();
    }

    /*---------------------------------------------------------
    Function: sync
    Description:  This pulls the Messari API to build a list
                 of Stablecoins, as defined by CMC.
    ---------------------------------------------------------*/
    async sync(self) {
        if (!self) self = this;
        self.stablecoins = [];

        let response = await self.client.assets.all({ limit: 500 });
        const allCoins = response.data.data;

        allCoins.forEach((coin) => {
            if (coin.profile.sector == 'Stablecoins' && !global.EXCLUDE_COINS.includes(coin.symbol)) {
                let platforms = [];

                try {
                    let token_types = coin.profile.token_details.type.split(', ');
                    token_types.forEach((token_type) => {
                        let platform_name = getTokenPlatform(token_type);
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
                scoin.msri.circulating_mcap = coin.metrics.marketcap.current_marketcap_usd;
                scoin.msri.volume = coin.metrics.market_data.real_volume_last_24_hours;
                scoin.msri.circulating_supply = coin.metrics.supply.circulating;
                scoin.msri.total_mcap =
                    scoin.msri.total_supply * scoin.msri.price ||
                    (scoin.msri.total_supply / scoin.msri.circulating_supply) * scoin.msri.circulating_mcap;
                self.stablecoins.push(scoin);
            } // if is stablecoin
        }); // for each
        return;
    }
} /* MessariInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = MessariInterface;
