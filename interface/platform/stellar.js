const PlatformInterface = require('./platform_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class StellarInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://horizon.stellar.org';

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    async getExplorerURL(address) {
        if (!address) {
            return 'https://stellar.expert/';
        } else {
            let code = await fetch(`${this.url}/assets?asset_issuer=${address}`)
                .then((resp) => resp.json())
                .then((data) => {
                    if( data && data._embedded && data._embedded.records ) {
                        let assets = [];

                        data._embedded.records.forEach( asset => {
                            if (asset.amount != 0) assets.push(asset);
                        });

                        if (assets.length > 1)
                            throw new Exception( `Error: More than one asset found for address ${address}` );
                        else if (assets.length == 0)
                            throw new Exception( `Error: No assets found for address ${address}` );
                        else {
                            return assets[0].asset_code;
                        }
                    }
                });
            return `https://stellar.expert/explorer/public/asset/${code}-${address}`;

        }
    }

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
    Function:    getTokenTotalSupply
    Description: Gets the total supply for token specified
                 by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {
        return fetch(`${this.url}/assets?asset_issuer=${token_contract_address}`)
            .then((resp) => resp.json())
            .then((data) => {
                if( data && data._embedded && data._embedded.records ) {
                    let assets = [];

                    data._embedded.records.forEach( asset => {
                        if (asset.amount != 0) assets.push(asset);
                    });

                    if (assets.length > 1)
                        throw new Exception( `Error: More than one asset found for address ${token_contract_address}` );
                    else if (assets.length == 0)
                        throw new Exception( `Error: No assets found for address ${token_contract_address}` );
                    else {
                        return Number(assets[0].amount);
                    }
                }
            })
            .catch(console.error);
    } // getTokenTotalSupply
} // StellarInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = StellarInterface;
