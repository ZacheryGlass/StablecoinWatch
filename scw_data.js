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
    new Stablecoin(null, 'TUSD', '1 USD', [
        new Platform('Ethereum', '0x0000000000085d4780B73119b644AE5ecd22b376'),
    ])
);

sc.push(
    new Stablecoin(null, 'BUSD', '1 USD', [
        new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53'),
    ])
);

sc.push(
    new Stablecoin(null, 'USDT', '1 USD', [
        new Platform('Tron', '41fde74827168724bdafdaf8896dc90afc0fa6641d'),
        new Platform('Bitcoin', 31),
        new Platform('Bitcoin (Liquid)'),
        new Platform('EOS', 'tethertether'),
        new Platform(
            'Algorand',
            'XIU7HGGAJ3QOTATPDSIIHPFVKMICXKHMOR2FJKHTVLII4FAOA3CYZQDLG4'
        ),
        new Platform(
            'Bitcoin Cash (SLP)',
            '9fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c11'
        ),
    ])
);

sc.push(
    new Stablecoin(
        'Tether EUR',
        'EURT',
        '1 EUR',
        [
            new Platform(
                'Ethereum',
                '0xabdf147870235fcfc34153828c769a70b3fae01f'
            ),
            new Platform('Bitcoin', 41),
        ],
        'https://wallet.tether.to/transparency',
        null,
        null,
        '/tether.png'
    )
);

sc.push(
    new Stablecoin(
        'Tether CNH',
        ' CNHT',
        '1 CNH',
        [
            new Platform(
                'Ethereum',
                '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef'
            ),
        ],
        'https://wallet.tether.to/transparency',
        null,
        null,
        '/tether.png'
    )
);

sc.push(
    new Stablecoin(
        'Token Gold',
        ' XAUT',
        '1oz Gold',
        [
            new Platform(
                'Ethereum',
                '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef'
            ),
        ],
        'Tether Gold (XAUT) is a cryptocurrency with a value meant to mirror the value of \
        the Gold. According to their site, Tether converts  cash into digital currency, to \
        anchor or “tether” the value of the coin to the price of assets or national \
        currencies like the US dollar, the Euro, and the Yen. Tether Gold (XAUT) is \
        issued on the Ethereum blockchain. For details on the issuance please refer to: \
        https://wallet.tether.to/transparency',
        null,
        null,
        '/tether-gold-logo.svg'
    )
);

// exports
module.exports = sc;
