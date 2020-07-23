const Stablecoin = require('./stablecoin');
const Platform = require('./platform');

let sc = [];

sc.push(new Stablecoin(null, 'USDC', '$1 USD'));
sc.push(new Stablecoin(null, 'PAX', '1 USD'));
sc.push(new Stablecoin(null, 'HUSD', '1 USD'));
sc.push(new Stablecoin(null, 'EURS', '1 EUR'));
sc.push(new Stablecoin(null, 'USDK', '1 USD'));
sc.push(new Stablecoin(null, 'GUSD', '1 USD'));
sc.push(new Stablecoin(null, 'DGX', '1g Gold'));
sc.push(new Stablecoin(null, 'SBD', '1 USD'));
sc.push(new Stablecoin(null, 'USDQ', '1 USD'));
sc.push(new Stablecoin(null, 'XCHF', '1 CHF'));
sc.push(new Stablecoin(null, 'BITCNY', '1 CNY'));
sc.push(new Stablecoin(null, 'XAUR', '0.001g Gold'));
sc.push(new Stablecoin(null, 'EOSDT', '1 USD'));
sc.push(new Stablecoin(null, 'CONST', '1 USD'));
sc.push(new Stablecoin(null, 'BITUSD', '1 USD'));
sc.push(new Stablecoin(null, 'XPD', '1 USD'));

sc.push(
    new Stablecoin(null, 'USDS', null, [
        new Platform('Ethereum', '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe'),
    ])
);

sc.push(
    new Stablecoin(null, 'USDT', '1 USD', [
        new Platform('Tron', '41fde74827168724bdafdaf8896dc90afc0fa6641d'),
        new Platform('Bitcoin', 31),
    ])
);

sc.push(
    new Stablecoin(null, 'TUSD', '1 USD', [
        new Platform('Ethereum', '0x0000000000085d4780B73119b644AE5ecd22b376'),
    ])
);

sc.push(
    new Stablecoin(null, 'BUSD', '1 USD', [
        new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53'),
    ])
);

// exports
module.exports = sc;
