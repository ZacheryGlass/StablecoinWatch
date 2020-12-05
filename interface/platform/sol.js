/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const solanaWeb3 = require('@solana/web3.js');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class SolanaInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://solana-api.projectserum.com';
    // url = 'https://api.mainnet-beta.solana.com';

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
        this.client = new solanaWeb3.Connection(this.url); 
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
            return 'https://explorer.solana.com/';
        } else {
            return `https://explorer.solana.com/address/${address}`;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddress
    Description: Gets the balance at an address for specified token
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddress(token_contract_address, address) {
        //TODO
    } // getTokenBalanceAtAddress

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {
        let pk = new solanaWeb3.PublicKey(token_contract_address);
        let data = await this.client.getTokenSupply(pk);
        return data.value.amount / (10 ** data.value.decimals);
    } // getTokenTotalSupply
} // SolanaInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = SolanaInterface;
