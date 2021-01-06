const keys = require('../../app/keys');
const CoinMarketCap = require('coinmarketcap-api');
const Stablecoin = require('../../models/stablecoin');
const Platform = require('../../models/platform');
const { urlify } = require('../../app/util');
const DataSourceInterface = require('./datasource_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class CoinMarketCapInterface extends DataSourceInterface {
    client = null;

    /*---------------------------------------------------------
    Function:   constructor
    Description: call super class constructor
    ---------------------------------------------------------*/
    constructor(update_rate) {
        super(update_rate);
        this.client = new CoinMarketCap(keys.cmc);
    }

    /*---------------------------------------------------------
    Function:    checkError
    Description: Checks the return status of an CoinMarketCap API
                 reponse to see if an error code was set.
    ---------------------------------------------------------*/
    checkError(status) {
        console.info(`${status.timestamp}: Used ${status.credit_count} CMC Credits`);

        if (status.error_code) {
            let code = status.error_code;
            let msg = status.error_message;
            throw `CMC API ERROR ${code}: ${msg}`;
        }
    } /* checkError() */

    /*---------------------------------------------------------
    Function:    sync
    Description: This pulls the CoinMarketCap API to build a list
                 of Stablecoins, as defined by CMC.
    ---------------------------------------------------------*/
    async sync(self) {
        if (!self) self = this;

        await self.client
            .getTickers({ limit: 2000 })
            .then((resp) => {
                console.info('Built CMC Coin List');
                self.checkError(resp.status);

                /*----------------------------------------------------
                CMC doesn't tag all stablecoins correctly so forcefully
                add to list here coins that are on CMC but not tagged
                ----------------------------------------------------*/
                let tickers = ['DAI', 'AMPL', 'SUSD', 'XAUT', 'USDT'];

                resp.data.forEach((coin) => {
                    if (
                        (coin.tags.includes('stablecoin-asset-backed') || coin.tags.includes('stablecoin')) &&
                        !global.EXCLUDE_COINS.includes(coin.symbol)
                    )
                        tickers.push(coin.symbol);
                });
                let fetching_metadata = self.client.getMetadata({ symbol: tickers }); // this call can be avoided as the same data is already in resp - probably
                let fetching_quote = self.client.getQuotes({ symbol: tickers });
                return Promise.all([fetching_metadata, fetching_quote]);
            })
            .then((scoins_arr) => {
                let metadata_resp = scoins_arr[0];
                let quote_resp = scoins_arr[1];
                self.checkError(metadata_resp.status);
                self.checkError(quote_resp.status);

                /*----------------------------------------------------
                build stablecoin list
                ----------------------------------------------------*/
                self.stablecoins = [];
                Object.keys(metadata_resp.data).forEach((key, i) => {
                    let md = metadata_resp.data[key];
                    let q = {};

                    if (quote_resp.data.hasOwnProperty(key)) q = quote_resp.data[key];

                    let scoin = new Stablecoin();
                    scoin.name = md.name;
                    scoin.symbol = md.symbol;
                    if( md.symbol != 'BUSD' ) /* CMC gives false platform data for BUSD */
                        scoin.platforms = md.platform
                            ? [
                                new Platform(
                                    md.platform.name == 'Binance Coin' ? 'Binance Chain' : md.platform.name,
                                    md.platform.token_address
                                ),
                            ]
                            : [new Platform(md.name)];
                    scoin.cmc.desc = urlify(md.description);
                    scoin.cmc.volume = q.quote ? q.quote.USD.volume_24h : null;
                    scoin.img_url = md.logo;
                    scoin.cmc.price = q.quote ? q.quote.USD.price : null;
                    scoin.cmc.total_supply = q.total_supply;
                    scoin.cmc.circulating_supply = q.circulating_supply;
                    scoin.cmc.circulating_mcap = q.quote ? q.quote.USD.market_cap : null;
                    scoin.cmc.total_mcap =
                        scoin.cmc.total_supply * scoin.cmc.price ||
                        (scoin.cmc.total_supply / scoin.cmc.circulating_supply) * scoin.cmc.circulating_mcap;

                    self.stablecoins.push(scoin);
                });
            })
            .catch((err) => {
                console.error(`Could not fetch CMC API: ${err}`);
            });
        return;
    } /* sync() */
} /* CoinMarketCapInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = CoinMarketCapInterface;
