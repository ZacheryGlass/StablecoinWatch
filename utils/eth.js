const keys = require('../keys');
const Web3 = require('web3');
const ERC20Contract = require('erc20-contract-js');

const web3 = new Web3(
    new Web3.providers.HttpProvider(
        `https://mainnet.infura.io/v3/${keys.infura.project_id}`
    )
);

exports.getTokenSupply = async (contract_address) => {
    const erc20Contract = new ERC20Contract(web3, contract_address);

    let x = Promise.all([
        erc20Contract.totalSupply().call(),
        erc20Contract.decimals().call(),
    ]).then(async (data) => {
        const totalSupply = data[0];
        const decimals = data[1];
        // console.log(totalSupply / 10 ** decimals);
        return totalSupply / 10 ** decimals;
    });
    // console.log(x);
    return x;
};