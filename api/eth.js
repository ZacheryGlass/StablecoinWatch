/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const keys = require('../keys');
const Web3 = require('web3');

/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
const ERC20Contract = require('erc20-contract-js');
const web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${keys.infura.project_id}`));

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

exports.getTokenSupply = async (contract_address) => {
    const erc20Contract = new ERC20Contract(web3, contract_address);
    let p_totalSupply = erc20Contract.totalSupply().call();
    let p_decimals = erc20Contract.decimals().call();
    return Promise.all([p_totalSupply, p_decimals]).then(async (data) => {
        const totalSupply = data[0];
        const decimals = data[1];
        return totalSupply / 10 ** decimals;
    });
};
