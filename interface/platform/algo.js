// https://developer.algorand.org/docs/reference/algorand-networks/mainnet/
// https://developer.purestake.io/code-samples

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const algosdk = require('algosdk');
const keys = require('../../app/keys');
const { sleep } = require('../../app/util');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class AlgorandInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://mainnet-algorand.api.purestake.io/idx2';
    client = null;
    api_calls = [];

    /*---------------------------------------------------------
    Function:    constructor
    Description: Initilaze class instantiation
    ---------------------------------------------------------*/
    constructor() {
        super();
        const token = {
            'X-API-key': keys.algo,
        };
        this.client = new algosdk.Indexer(token, this.url, '');
    }

    /*---------------------------------------------------------
    Function:    checkRateLimit
    Description: 
    ---------------------------------------------------------*/
    async checkRateLimit() {
        const MILLISECOND = 1;
        const SECOND = 1000 * MILLISECOND;
        const MINUTE = 60 * SECOND;
        const MAX_CALLS_PER_SEC = 1;

        // record the time of the latest API call
        this.api_calls.unshift( Date.now() );

        if( this.api_calls.length >= MAX_CALLS_PER_SEC) {
            let ms_since_nth_call = Date.now() - this.api_calls.pop();
            let ms_to_sleep = 5*SECOND - ms_since_nth_call;
            ms_to_sleep = Math.max( ms_to_sleep, 0 );
            
            if(ms_to_sleep) {
                console.debug(`Algorand Purestake rate limit hit, sleeping for ${ms_to_sleep}ms`);
                await sleep( ms_to_sleep );
            }
        }

    } /* checkRateLimit */

    /*---------------------------------------------------------
    Function:    getAssetInfo
    Description: 
    ---------------------------------------------------------*/
    async getAssetInfoByID(id) {
        try{
            await this.checkRateLimit();
            const resp = await this.client.searchForAssets().limit(1).index(id).do();
            return resp.assets[0];
        } catch (e) {
            console.error(e);
        }
    }

    /*---------------------------------------------------------
    Function:    getAccountInfo
    Description: 
    ---------------------------------------------------------*/
    async getAccountInfo(address) {
        try{
            await this.checkRateLimit();
            const resp = await this.client.lookupAccountByID(address).do();
            return resp.account;
        } catch (e) {
            console.error(e);
        }
    }

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        if (!address) {
            return 'https://algoexplorer.io/';
        } else {
            return this.getAccountInfo(address).then((info) => {
                if (info.assets.length == 1) {
                    return `https://algoexplorer.io/asset/${info.assets[0]['asset-id']}`;
                } else {
                    return `https://algoexplorer.io/address/${address}`;
                }
            });
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Gets the Omni exporer to get the total supply
                 for coin specified by 'contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(contract_address) {
        let info = await this.getAccountInfo(contract_address);
        const assets = info['created-assets'];

        if (assets.length > 1) {
            throw `Error: Multiple tokens created by this address. Use getTokenSupplyById instead.`;
        } else {
            // get the total number of tokens issued
            const total_minted = assets[0].params.total / 10 ** assets[0].params.decimals;
            const asset_id = assets[0].index;

            // check how many tokens are held by the address that created this token.
            // consider those as not yet issued.
            let amount_not_yet_issued = 0;
            if( info.assets.length > 0) {
                info.assets.forEach( asset => {
                    if( asset[`asset-id`] == asset_id) {
                        amount_not_yet_issued = asset.amount / 10 ** assets[0].params.decimals;
                    }
                });
            }
                
            return total_minted - amount_not_yet_issued;
        }
    }
} /* AlgorandInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = AlgorandInterface;
