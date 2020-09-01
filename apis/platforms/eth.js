/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('../platform_interface');
const keys = require('../../keys');
const Web3 = require('web3');
const ERC20Contract = require('erc20-contract-js');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class EthereumInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://mainnet.infura.io';

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
        this.client = new Web3(new Web3.providers.HttpProvider(`${this.url}/v3/${keys.infura.project_id}`));
    }

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {

        switch (token_contract_address) {
            case '0x6b175474e89094c44da98b954eedeac495271d0f': /* DAI */
                /*---------------------------------------------------------
                Special case for DAI as it is not held in a single contract
                token supply explained here 
                https://github.com/makerdao/developerguides/blob/master/dai/dai-supply/dai-supply.md
                ---------------------------------------------------------*/
                const vatAddr = '0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B';
                const abi = [
                    {
                        inputs: [],
                        name: 'debt',
                        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                        type: 'function',
                    },
                ];

                const vat = new this.client.eth.Contract(abi, vatAddr);
                return vat.methods
                    .debt()
                    .call()
                    .then((supply) => supply / Math.pow(10, 45));
                break;

            default:
                /*---------------------------------------------------------
                General Case for all standard ERC-20 tokens
                ---------------------------------------------------------*/
                const erc20Contract = new ERC20Contract(this.client, token_contract_address);
                let p_totalSupply = erc20Contract.totalSupply().call();
                let p_decimals = erc20Contract.decimals().call();
                return Promise.all([p_totalSupply, p_decimals]).then(async (data) => {
                    const totalSupply = data[0];
                    const decimals = data[1];
                    return totalSupply / 10 ** decimals;
                });
                break;
        }
    } // getTokenTotalSupply
} // EthereumInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = EthereumInterface;
