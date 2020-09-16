/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const util = require('../../app/util');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class OmniInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://api.omniexplorer.info';

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'token_id'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(token_id) {
        if (!token_id) {
            return 'https://omniexplorer.info/';
        } else {
            return `https://omniexplorer.info/asset/${token_id}`;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Gets the Omni exporer to get the total supply
                 for coin specified by 'token_id'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_id) {
        const omni_api_url = `${this.url}/v1/property/${token_id}`;
        const response = await fetch(omni_api_url);
        const data = await response.json();
        const total_token_supply = Number(data.totaltokens);
        return total_token_supply;
    } // getTokenTotalSupply
} // OmniInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = OmniInterface;
