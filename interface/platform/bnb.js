/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const { sleep } = require('../../app/util');

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
            rate_limit_fetch
    Description:
            Fetch slowly
    ---------------------------------------------------------*/
    async rate_limit_fetch(url) {
        await sleep(1000);  /* Binance-Chain API rate limited to 1 call/sec */
                            /* TODO: Consider keeping track of last call    */
                            /* time so we don't have to wait 1s every time  */
        return fetch(url);
    } // rate_limit_fetch


    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'symbol'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(symbol) {
        if (symbol) 
            return `https://explorer.binance.org/asset/${symbol}`;
        else
            return `https://explorer.binance.org/`;
    } // getExplorerURL
    

    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddress
    Description: Wrapper function for getTokenBalanceAtAddressBySymbol
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddress(symbol, address) {
        return this.getTokenBalanceAtAddressBySymbol(symbol, address);
            
    } // getTokenBalanceAtAddress


    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddressByAddress
    Description: Get the token balance at the specified address
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddressByAddress(owner_address, address) {
        return this.getSymbolsFromOwnerAddress(owner_address)
        .then( symbols => {
            if ( symbols.length  < 1 ) {
                throw new Error( `BNB API ERROR: getTokenBalanceAtAddressByAddress(): NO TOKEN FOUND FOR ADDRESS ${owner_address}` )
            } else if ( symbols.length  > 1 ) {
                throw new Error( `BNB API ERROR: getTokenBalanceAtAddressByAddress(): MORE THAN 1 TOKEN FOUND FOR ADDRESS ${owner_address}` )
            } else {
                // this address only owns 1 token, so return get the total supply of that token
                return symbols[0];
            }
        })
        .then(symbol => {
            this.getTokenBalanceAtAddressBySymbol(symbol, address)
        });
        
    } // getTokenBalanceAtAddress


    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddressBySymbol
    Description: Gets the balance at an address for specified token
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddressBySymbol(symbol, address) {
        return this.rate_limit_fetch(`${this.url}/account/${address}`)
            .then((resp) => resp.json())
            .then(data => {
                let ret = 0;
                data.balances.forEach( balance => {
                    if (balance.symbol == symbol) 
                        ret = Number(balance.free) + Number(balance.frozen) + Number(balance.locked) ;
                })
                return Number(ret);
            })
            
    } // getTokenBalanceAtAddressBySymbol


    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Wrapper function
    ---------------------------------------------------------*/
    async getTokenTotalSupply(symbol_or_address) {
        let ret;
        try {
            ret = await this.getTokenTotalSupplyBySymbol(symbol_or_address);
            if(!ret) ret = await this.getTokenTotalSupplyByAddress(symbol_or_address);
        } catch {
            try {
                ret = await this.getTokenTotalSupplyByAddress(symbol_or_address);
            } catch (e) {
                throw new Error( `Cannot find BNB Symbol or Address: ${symbol_or_address}; ${e}`);
            }
        }
        return Number(ret);

    } // getTokenTotalSupplyByAddress


    /*---------------------------------------------------------
    Function:    getTokenTotalSupplyByAddress
    Description: Gets the total supply for token specified
                 by 'owner_address'
    Note:        Only works if the owner address owns only 1 token
    ---------------------------------------------------------*/
    async getTokenTotalSupplyByAddress(owner_address) {
        return this.getSymbolsFromOwnerAddress(owner_address)
            .then( symbols => {
                if ( symbols.length  < 1 ) {
                    throw new Error( `BNB API ERROR: getTokenTotalSupplyByAddress(): NO TOKEN FOUND FOR ADDRESS ${owner_address}` )
                } else if ( symbols.length  > 1 ) {
                    throw new Error( `BNB API ERROR: getTokenTotalSupplyByAddress(): MORE THAN 1 TOKEN FOUND FOR ADDRESS ${owner_address}` )
                } else {
                    // this address only owns 1 token, so return get the total supply of that token
                    return symbols[0];
                }
            })
            .then(symbol => {
                return this.getTokenTotalSupplyBySymbol(symbol);
            });

    } // getTokenTotalSupplyByAddress


    /*---------------------------------------------------------
    Function:    getTokenTotalSupplyBySymbol
    Description: Gets the total supply for token specified
                 by 'symbol'
    ---------------------------------------------------------*/
    async getTokenTotalSupplyBySymbol(symbol) {
        return this.rate_limit_fetch(`${this.url}/tokens?limit=500`)
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
    } // getTokenTotalSupplyBySymbol


    /*---------------------------------------------------------
    Function:    getSymbolsFromOwnerAddress
    Description: Gets the on-chain symbol of all tokens that are
                owned/created by the specified address
    ---------------------------------------------------------*/
    async getSymbolsFromOwnerAddress( owner_address ) {
        return this.rate_limit_fetch(`${this.url}/tokens?limit=500`)
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
    } // getSymbolsFromOwnerAddress

} // BinanceChainInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = BinanceChainInterface;
