/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const keys = require('../../app/keys');
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
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        if (!address) {
            return 'https://etherscan.io/';
        } else {
            // make this go to actual token page
            // instead of address page in the future.
            // Using Etherscan API
            return `https://etherscan.io/address/${address}`;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddress
    Description: Gets the balance at an address for specified token
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddress(token_contract_address, address) {
        const erc20Contract = new ERC20Contract(this.client, token_contract_address);
        let p_token_balance = erc20Contract.balanceOf(address).call();
        let p_decimals = erc20Contract.decimals().call();
        return Promise.all([p_token_balance, p_decimals]).then(async (data) => {
            const totalBalance = data[0];
            const decimals = data[1];
            return totalBalance / 10 ** decimals;
        });

    } // getTokenBalanceAtAddress


    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {
        switch (token_contract_address) {
            case '0x6b175474e89094c44da98b954eedeac495271d0f' /* DAI */:
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

                    let total_supply = totalSupply / 10 ** decimals;

                    /*---------------------------------------------------------
                    Protect against garbage value returns. Arbitrary 1Bil limit.
                    ---------------------------------------------------------*/
                    if (total_supply > 100000000000) return 0;
                    else return total_supply;
                });
                break;
        }
    } // getTokenTotalSupply
} // EthereumInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = EthereumInterface;
