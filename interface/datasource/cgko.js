const CoinGecko = require('coingecko-api');
const Stablecoin = require('../../models/stablecoin');
// const Platform = require('../../models/platform');
const { urlify, sleep } = require('../../app/util');
const DataSourceInterface = require('../datasource_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class CoinGeckoInterface extends DataSourceInterface {
    
    client = null;


    api_calls = [];
    syncing = false;

    /*---------------------------------------------------------
    Function:   constructor
    Description: call super class constructor
    ---------------------------------------------------------*/
    constructor(update_rate) {
        super(update_rate);
        this.client = new CoinGecko();
    }

    /*---------------------------------------------------------
    Function:    checkRateLimit
    Description: 
    ---------------------------------------------------------*/
    async checkRateLimit() {
        const MILLISECOND = 1;
        const SECOND = 1000 * MILLISECOND;
        const MINUTE = 60 * SECOND;
        const MAX_CALLS_PER_MIN = 60; /* Limit is supposedly 100 but was getting rate limited at 90 so using 60 to be safe */

        // record the time of the latest API call
        this.api_calls.unshift( Date.now() );

        // console.debug('CGKO REQUESTS: ', this.api_calls.length);
        if( this.api_calls.length >= MAX_CALLS_PER_MIN) {
            let ms_since_nth_call = Date.now() - this.api_calls.pop();
            let ms_to_sleep = MINUTE - ms_since_nth_call;
            ms_to_sleep = Math.max( ms_to_sleep, 0 );
            
            if(ms_to_sleep) {
                console.debug(`CoinGecko rate limit hit, sleeping for ${ms_to_sleep}ms`);
                await sleep( ms_to_sleep );
            }
        }

    } /* checkRateLimit */

    /*---------------------------------------------------------
    Function:    checkError
    Description: Checks the return status of an CoinGecko API
                 reponse to see if an error code was set.
    ---------------------------------------------------------*/
    checkError(resp) {
        if (!resp.success) {
            let code = resp.code;
            let msg = resp.message;
            if (resp.data && resp.data[0] && resp.data[0].error ) {
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

        
        /*---------------------------------------------------------
        Check lock
        ---------------------------------------------------------*/
        if(self.syncing) return;

        /*---------------------------------------------------------
        Lock 'syncing' mutex
        ---------------------------------------------------------*/
        self.syncing = true;
        


        /*---------------------------------------------------------
        Get list of top N coins on CoinGecko
        API would only return 250 at a time so this may require 
        multiple API calls
        ---------------------------------------------------------*/
        let n = 250;

        if( global.DEBUG ) 
            n = 50;

        await self.checkRateLimit();
        let resp = await self.client.coins.all({
            order: CoinGecko.ORDER.MARKET_CAP_DESC,
            per_page: n, // 250 is max
            page: 1,
            localization: false,
            sparkline: false
        });
        self.checkError(resp);

        let all_coins = resp.data;

        /*---------------------------------------------------------
        Loop and retrieve data for each coin
        ---------------------------------------------------------*/
        let stablecoins = [];
        for( let i = 0; i < n; i++ ) {
            
            let coin = all_coins[i];

            if( !coin || !coin.id ) continue;
            
            /*---------------------------------------------------------
            Retrieve data for each coin
            ---------------------------------------------------------*/
            await self.checkRateLimit();
            try {
                resp = await self.client.coins.fetch(coin.id, {
                    tickers: false,
                    market_data: true,
                    community_data: false,
                    developer_data: false,
                    localization: false,
                    sparkline: false,
                });
            } catch (e) {
                console.warn( `CoinGecko API Error when feching data for ${coin.id}:\n\t${e}`)
                continue;
            }
            
            /*---------------------------------------------------------
            Validate response
            ---------------------------------------------------------*/
            self.checkError(resp);
            coin = resp.data;
            if( !coin || !coin.symbol) continue;

            /*---------------------------------------------------------
            If this coin is tagged as a stablecoin by CoinGecko, create
            a Stablecoin object and append to list
            ---------------------------------------------------------*/
            if (!global.EXCLUDE_LIST.includes(coin.symbol.toUpperCase()) 
              && (coin.categories.includes('Stablecoins') || coin.categories.includes('Rebase Tokens'))) {
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
            } /* if tagged as stablecoin */

        } /* for-loop */

        /*---------------------------------------------------------
        Done building stablecoin list, replace old list with the
        new one we've built.
        ---------------------------------------------------------*/
        self.stablecoins = stablecoins;
        
        console.info("CoinGecko Sync Done");
        
        /*---------------------------------------------------------
        Unlock
        ---------------------------------------------------------*/
        self.syncing = false;

        return;

    } /* sync() */

} /* CoinGeckoInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = CoinGeckoInterface;
