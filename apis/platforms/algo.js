// https://developer.algorand.org/docs/reference/algorand-networks/mainnet/
// https://developer.purestake.io/code-samples

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('../platform_interface');
const algosdk = require('algosdk');
const keys = require('../../keys');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class AlgorandInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://mainnet-algorand.api.purestake.io/ps1';
    client = null;

    /*---------------------------------------------------------
    Function:    constructor
    Description: Initilaze class instantiation
    ---------------------------------------------------------*/
    constructor() {
        super();
        const token = {
            'X-API-key': keys.algo,
        };
        this.client = new algosdk.Algod(token, this.url, '');
    }

    /*---------------------------------------------------------
    Function:    getAssetInfo
    Description: 
    ---------------------------------------------------------*/
    async getAssetInfo(asset_id) {
        return this.client.assetInformation(asset_id);
    }

    /*---------------------------------------------------------
    Function:    getAccountInfo
    Description: 
    ---------------------------------------------------------*/
    async getAccountInfo(address) {
        return this.client.accountInformation(address);
    }

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Gets the Omni exporer to get the total supply
                 for coin specified by 'contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(contract_address) {
        let info = await this.getAccountInfo(contract_address);
        let coin_ids = Object.keys(info.thisassettotal);

        if (coin_ids.length > 1) {
            throw `Error: Multiple tokens created by this address. Use getTokenSupplyById instead.`;
        } else {
            let coin_data = info.thisassettotal[coin_ids[0]];
            let total_minted = coin_data.total / 10 ** coin_data.decimals;
            let amount_not_yet_issued = info.assets[coin_ids[0]].amount / 10 ** coin_data.decimals;
            return total_minted - amount_not_yet_issued;
        }
    }
} // AlgorandInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = AlgorandInterface;
