
/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('../platform_interface');


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
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(id) {
        switch (id) {
            case 'Tether USD':
                return 16561000;
                break;

            default:
                throw new Error("No Liquid API!")
                break;
        }

    } // getTokenTotalSupply
} // LiquidInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = LiquidInterface;

