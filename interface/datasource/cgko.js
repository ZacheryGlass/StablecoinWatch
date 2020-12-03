//temp
global.EXCLUDE_LIST = ['WBTC', 'DGD', 'RSR', 'DPT', 'KBC', '1GOLD'];
global.APPROVE_LIST = ['USDT'];
global.fetch = require('node-fetch');
global.WebSocket = require('ws');
//temp


// const keys = require('../../app/keys');
const CoinGecko = require('coingecko-api');
const Stablecoin = require('../../models/stablecoin');
// const Platform = require('../../models/platform');
const { urlify, sleep } = require('../../app/util');
const DataSourceInterface = require('./datasource_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class CoinGeckoInterface extends DataSourceInterface {
    client = null;

    /*---------------------------------------------------------
    Function:   constructor
    Description: call super class constructor
    ---------------------------------------------------------*/
    constructor(update_rate) {
        super(update_rate);
        this.client = new CoinGecko();
        console.log('CREATED CLIENT') // temp
    }

    /*---------------------------------------------------------
    Function:    checkError
    Description: Checks the return status of an CoinGecko API
                 reponse to see if an error code was set.
    ---------------------------------------------------------*/
    checkError(resp) {
        if (!resp.success) {
            let code = resp.code;
            let msg = resp.message;
            if (resp.data[0] && resp.data[0].error ) {
                msg = resp.data[0].error;
            } 
            throw `CGKO API ERROR ${code}: ${msg}`;
        }
    } /* checkError() */

    /*---------------------------------------------------------
    Function:    sync
    Description: This pulls the CoinGecko API to build a list
                 of Stablecoins, as defined by cgko.
    ---------------------------------------------------------*/
    async sync(self) {
        if (!self) self = this;

        let resp = await this.client.coins.all({
            order: CoinGecko.ORDER.MARKET_CAP_DESC,
            per_page: 500,
            page: 1,
            localization: false,
            sparkline: false
        });

        this.checkError(resp);

        let all_coins = resp.data;

        let stablecoins = [];
        for( let i = 0; i < 150; i++ ) {
            let coin = all_coins[i];
            
            const resp = await this.client.coins.fetch(coin.id, {
                tickers: false,
                market_data: true,
                community_data: false,
                developer_data: false,
                localization: false,
                sparkline: false,
            });
            this.checkError(resp);

            coin = resp.data;

            if (!global.EXCLUDE_LIST.includes(coin.symbol.toUpperCase()) 
              && (coin.categories.includes('Stablecoins') || coin.categories.includes('Rebase Tokens'))) {
                
                console.log('Found stablecoin ', coin.name);
                let scoin = new Stablecoin();
                scoin.name = coin.name;
                scoin.symbol = coin.symbol.toUpperCase();
                // scoin.platforms = md.platform
                //     ? [
                //         new Platform(
                //             md.platform.name == 'Binance Coin' ? 'BNB Chain' : md.platform.name,
                //             md.platform.token_address
                //         ),
                //         ]
                //     : [new Platform(md.name)];
                scoin.cgko.desc = urlify(coin.description.en);
                scoin.cgko.volume = coin.market_data.total_volume.usd;
                // scoin.img_url = coin.image.small;
                scoin.cgko.price = coin.market_data.current_price.usd;
                scoin.cgko.total_supply = coin.market_data.total_supply;
                scoin.cgko.circulating_supply = coin.market_data.circulating_supply;
                scoin.cgko.circulating_mcap = coin.market_data.market_cap.usd;
                scoin.cgko.total_mcap =
                    scoin.cgko.total_supply * scoin.cgko.price ||
                    (scoin.cgko.total_supply / scoin.cgko.circulating_supply) * scoin.cgko.circulating_mcap;
                // coin.market_data.market_cap_change_24h
                // coin.market_data.market_cap_change_percentage_24h
                
                stablecoins.push(scoin);

            } // if is stablecoin

            
            /*---------------------------------------------------------
            CoinGecko API limit is 100 calls per minute. We do 1 call 
            for each iteration of this for loop. So every 100 calls, we 
            need to sleep for 1 minute. 
            ---------------------------------------------------------*/
            const api_limit = 50; /* 90 instead of 100 for saftey */
            if( i && i % api_limit == 0) {
                console.log('Sleeping for 1 min');
                await sleep(1000 * 60);
                console.log('Done Sleeping');
            }

        }// for

        self.stablecoins = stablecoins;

        console.log(self.stablecoins.length);
        
        return;

    } /* sync() */

} /* CoinGeckoInterface */



const interface = new CoinGeckoInterface(60 * 12);

interface.sync();
