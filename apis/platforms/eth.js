/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const keys = require('../../keys');
const Web3 = require('web3');

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
const ERC20Contract = require('erc20-contract-js');
const web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${keys.infura.project_id}`));

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

exports.getTokenTotalSupply = async (contract_address) => {
    /*---------------------------------------------------------
    Special case for DAI as it is not held in a single contract
    token supply explained here 
    https://github.com/makerdao/developerguides/blob/master/dai/dai-supply/dai-supply.md
    ---------------------------------------------------------*/
    if (contract_address == '0x6b175474e89094c44da98b954eedeac495271d0f') {
        const vatAddr = '0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B';
        const abi = [
            {
                inputs: [],
                name: 'debt',
                outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                type: 'function',
            },
        ];

        const vat = new web3.eth.Contract(abi, vatAddr);
        return vat.methods
            .debt()
            .call()
            .then((supply) => supply / Math.pow(10, 45));
    }

    /*---------------------------------------------------------
    General Case for all standard ERC-20 tokens
    ---------------------------------------------------------*/
    const erc20Contract = new ERC20Contract(web3, contract_address);
    let p_totalSupply = erc20Contract.totalSupply().call();
    let p_decimals = erc20Contract.decimals().call();
    return Promise.all([p_totalSupply, p_decimals]).then(async (data) => {
        const totalSupply = data[0];
        const decimals = data[1];
        return totalSupply / 10 ** decimals;
    });
};
