/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class LiquidInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://mainnet.infura.io';

    /*---------------------------------------------------------
    API Client
    ---------------------------------------------------------*/
    client = null;

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        if (!address) {
            return 'https://blockstream.info/liquid/';
        } else {
            return `https://blockstream.info/liquid/asset/${address}`;
        }
    }

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(id) {
        switch (id) {
            case 'H4UWQS836njW4QJ6WfkGAPjaYtK2twLnZE':
                return 16561000;
                break;

            default:
                throw new Error('No Liquid API!');
                break;
        }
    } // getTokenTotalSupply
} // LiquidInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = LiquidInterface;
