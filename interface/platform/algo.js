// https://developer.algorand.org/docs/reference/algorand-networks/mainnet/
// https://developer.purestake.io/code-samples

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('../platform_interface');
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

        if( this.api_calls.length > MAX_CALLS_PER_SEC) {
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
        } else if (assets.length == 0 ) {
            throw `Error: No tokens created by this address.`;
        } else {
	    
            // get the total number of tokens issued
	        const decimals = assets[0].params.decimals;
            const total_minted = assets[0].params.total / 10 ** decimals;
            const asset_id = assets[0].index;

            // check how many tokens are held by the address that created this token.
            // consider those as not yet issued.
            let amount_not_yet_issued = 0;
            if( info.assets.length > 0) {
                info.assets.forEach( asset => {
                    if( asset[`asset-id`] == asset_id) {
                        amount_not_yet_issued = asset.amount / 10 ** decimals;
                    }
                });
            }
                
            return total_minted - amount_not_yet_issued;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddress
    Description: TODO
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddress(creator_address, lookup_address) {
        let creator_address_info = await this.getAccountInfo(creator_address);

        const assets = creator_address_info['created-assets'];
	
	if (assets.length > 1) {
            throw `Error: Multiple tokens created by this address. Use getTokenBalanceAtAddressByID instead.`;
        } else if (assets.length == 0 ) {
            throw `Error: No tokens created by this address.`;
        } else {
            const token_id = assets[0].index;
            const decimals = assets[0].params.decimals;
            
            // check how many tokens are held by the lookup_address
            let balance = 0;
            let lookup_address_info = await this.getAccountInfo(lookup_address);
            if( lookup_address_info.assets.length > 0) {
                lookup_address_info.assets.forEach( asset => {
                    if( asset[`asset-id`] == token_id) {
                        balance = asset.amount / 10 ** decimals;
                    }
                });
            }
            return balance;
	    }
    }

    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddressByID
    Description: TODO
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddressByID(asset_id, lookup_address) {

        const info = await this.getAssetInfoByID(asset_id);
        const decimals = info.params.decimals;

        // check how many tokens are held by the lookup_address
        let balance = 0;
        let lookup_address_info = await this.getAccountInfo(lookup_address);
        if( lookup_address_info.assets.length > 0) {
            lookup_address_info.assets.forEach( asset => {
                if( asset[`asset-id`] == asset_id) {
                    balance = asset.amount / 10 ** decimals;
                }
            });
        }

        return balance;
    }

    /*---------------------------------------------------------
    Function:    getTokenIdByAddress
    Description: Get the SINGLE token created by this address
    Note:        This function will fail the creator_address has
                 created more than 1 token.
    ---------------------------------------------------------*/
    async getTokenIdByAddress(creator_address) {
        const assets = await this.getTokenIdsByAddress(creator_address);

        if (assets.length > 1) {
            throw `Error: Multiple tokens created by this address.`;
        } else if (assets.length == 0 ) {
            throw `Error: No tokens created by this address.`;
        } else {
            return assets[0].index;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenIdByAddress
    Description: Get *all* tokens created by this address
    ---------------------------------------------------------*/
    async getTokenIdsByAddress(creator_address) {
        let address_info = await this.getAccountInfo(creator_address);
        return address_info['created-assets'];
    }

} /* AlgorandInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = AlgorandInterface;
