const Stablecoin = require('./stablecoin');
const Platform = require('./platform');

let scw_data = [];

// manual data for Tether
scw_data.push(
    new Stablecoin(null, 'USDT', [
        new Platform('Tron', '41fde74827168724bdafdaf8896dc90afc0fa6641d'),
        new Platform('Bitcoin', 31),
    ])
);

// manual data for TrueUSD
scw_data.push(
    new Stablecoin(
        null,
        'TUSD',
        new Platform('Ethereum', '0x0000000000085d4780B73119b644AE5ecd22b376')
    )
);

// manual data for Binance USD
scw_data.push(
    new Stablecoin(
        null,
        'BUSD',
        new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53')
    )
);

// manual data for StableUSD
scw_data.push(
    new Stablecoin(null, 'USDS', [
        new Platform('Ethereum', '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe'),
    ])
);

// exports
module.exports = scw_data;
