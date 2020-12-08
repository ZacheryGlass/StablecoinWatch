/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class BinanceChainInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://dex.binance.org/api/v1';

    /*---------------------------------------------------------
    API Client
    ---------------------------------------------------------*/
    client = null;

    /*---------------------------------------------------------
    Function:    constructor
    Description: Initilaze class instantiation
    ---------------------------------------------------------*/
    constructor() {
        super();
    }

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        if (address) 
            return `https://explorer.binance.org/address/${address}`;
        else
            return `https://explorer.binance.org/`;
    } // getExplorerURL
    
    // /*---------------------------------------------------------
    // Function:    getTokenBalanceAtAddress
    // Description: Gets the balance at an address for specified token
    // ---------------------------------------------------------*/
    // async getTokenBalanceAtAddress(token_contract_address, address) {
    //     return fetch(`${this.url}/address/${address}/qrc20-balance-history/${token_contract_address}?limit=1`)
    //         .then((resp) => resp.json())
    //         .then((data) => data.transactions[0].tokens[0].balance / 10 ** data.transactions[0].tokens[0].decimals)
    //         .catch(console.error);
    // } // getTokenBalanceAtAddress

    /*---------------------------------------------------------
    Function:    getTokenTotalSupplyBySymbol
    Description: Gets the total supply for token specified
                 by 'symbol'
    ---------------------------------------------------------*/
    async getTokenTotalSupplyBySymbol(symbol) {
        return fetch(`${url}/tokens?limit=500`)
            .then((resp) => resp.json())
            .then(data => {
                let total_supply;
                data.forEach(coin => {
                    if (coin.symbol == symbol){
                        total_supply = coin.total_supply;
                    }
                });
                if (total_supply)
                    return total_supply;
                else
                    throw new Error(`BNB API ERROR: getTokenTotalSupplyBySymbol(): COULD NOT FIND SYMBOL ${symbol}`)
    
            })
            .catch(console.error);
    } // getTokenTotalSupplyBySymbol

    /*---------------------------------------------------------
    Function:    getSymbolsFromOwnerAddress
    Description: Gets the on-chain symbol of all tokens that are
                owned/created by the specified address
    ---------------------------------------------------------*/
    async getSymbolsFromOwnerAddress( owner_address ) {
        return fetch(`${url}/tokens?limit=500`)
            .then((resp) => resp.json())
            .then(data => {
                let symbols = []; // array bc an address can own more than 1 token
                data.forEach(coin => {
                    if (coin.owner == owner_address){
                        symbols.push(coin.symbol);
                    }
                });
                return symbols;
            })
            .catch(console.error);
    } // getSymbolsFromOwnerAddress

} // BinanceChainInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = BinanceChainInterface;
