/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const Stablecoin = require('../stablecoin');
const Platform = require('../platform');

/*---------------------------------------------------------
    MODULE VARIABLES
---------------------------------------------------------*/
let glb_sc = [];

/*---------------------------------------------------------
    DATA
---------------------------------------------------------*/

/* USDC */
let coin = new Stablecoin();
coin.symbol = 'USDC';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* IDRT */
coin = new Stablecoin();
coin.symbol = 'IDRT ;';
coin.scw.peg = '1 Rupiah';
glb_sc.push(coin);

/* PAX */
coin = new Stablecoin();
coin.symbol = 'PAX';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* HUSD */
coin = new Stablecoin();
coin.symbol = 'HUSD';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* EURS */
coin = new Stablecoin();
coin.symbol = 'EURS';
coin.scw.peg = '1 EUR';
glb_sc.push(coin);

/* USDK */
coin = new Stablecoin();
coin.symbol = 'USDK';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* GUSD */
coin = new Stablecoin();
coin.symbol = 'GUSD';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* Digix Gold token */
coin = new Stablecoin();
coin.symbol = 'DGX';
coin.scw.peg = '1g Gold';
glb_sc.push(coin);

/* SBD */
coin = new Stablecoin();
coin.symbol = 'SBD';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* USDQ */
coin = new Stablecoin();
coin.symbol = 'USDQ';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* XCHF */
coin = new Stablecoin();
coin.symbol = 'XCHF';
coin.scw.peg = '1 CHF';
glb_sc.push(coin);

/* BITCNY */
coin = new Stablecoin();
coin.symbol = 'BITCNY';
coin.scw.peg = '1 CNY';
glb_sc.push(coin);

/* XAUR */
coin = new Stablecoin();
coin.symbol = 'XAUR';
coin.scw.peg = '.001g Gold';
glb_sc.push(coin);

/* EOSDT */
coin = new Stablecoin();
coin.symbol = 'EOSDT';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* CONST */
coin = new Stablecoin();
coin.symbol = 'CONST';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* BITUSD */
coin = new Stablecoin();
coin.symbol = 'BITUSD';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* XPD */
coin = new Stablecoin();
coin.symbol = 'XPD';
coin.scw.peg = '1 USD';
glb_sc.push(coin);

/* StableUSD / Stably */
coin = new Stablecoin();
coin.symbol = 'USDS';
coin.scw.peg = '1 USD';
coin.platforms.push(new Platform('Ethereum', '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe'));
glb_sc.push(coin);

/* TrueUSD */
coin = new Stablecoin();
coin.symbol = 'TUSD';
coin.scw.peg = '1 USD';
coin.platforms.push(new Platform('Ethereum', '0x0000000000085d4780B73119b644AE5ecd22b376'));
glb_sc.push(coin);

/* Binance USD */
coin = new Stablecoin();
coin.symbol = 'BUSD';
coin.scw.peg = '1 USD';
coin.platforms.push(new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53'));
glb_sc.push(coin);

/* Tether */
coin = new Stablecoin();
coin.symbol = 'USDT';
coin.scw.peg = '1 USD';
coin.platforms.push(new Platform('Tron', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'));
coin.platforms.push(new Platform('Bitcoin (Omni)', 31));
coin.platforms.push(new Platform('Bitcoin (Liquid)'));
coin.platforms.push(new Platform('EOS', 'tethertether'));
coin.platforms.push(new Platform('Algorand', 'XIU7HGGAJ3QOTATPDSIIHPFVKMICXKHMOR2FJKHTVLII4FAOA3CYZQDLG4'));
coin.platforms.push(new Platform('Bitcoin Cash', '9fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c11'));
glb_sc.push(coin);

/* Tether EUR */
coin = new Stablecoin();
coin.name = 'Tether EUR';
coin.symbol = 'EURT';
coin.scw.peg = '1 EUR';
coin.platforms.push(new Platform('Ethereum', '0xabdf147870235fcfc34153828c769a70b3fae01f'));
coin.platforms.push(new Platform('Bitcoin', 41));
coin.scw.desc = 'https://wallet.tether.to/transparency';
coin.img_url = '/tether.png';
glb_sc.push(coin);

/* Tether CNH */
coin = new Stablecoin();
coin.name = 'Tether CNH';
coin.symbol = 'CNHT';
coin.scw.peg = '1 CNH';
coin.platforms.push(new Platform('Ethereum', '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef'));
coin.scw.desc = 'https://wallet.tether.to/transparency';
coin.img_url = '/tether.png';
glb_sc.push(coin);

/* Token Gold */
coin = new Stablecoin();
coin.name = 'Token Gold';
coin.symbol = 'XAUT';
coin.scw.peg = '1oz Gold';
coin.platforms.push(new Platform('Ethereum', '0x4922a015c4407F87432B179bb209e125432E4a2A'));
coin.scw.desc =
    'Tether Gold (XAUT) is a cryptocurrency with a value meant to mirror the value of \
the Gold. According to their site, Tether converts  cash into digital currency, to \
anchor or “tether” the value of the coin to the price of assets or national \
currencies like the US dollar, the Euro, and the Yen. Tether Gold (XAUT) is \
issued on the Ethereum blockchain. For details on the issuance please refer to: \
https://wallet.tether.to/transparency';
coin.img_url = '/tether-gold-logo.svg';
glb_sc.push(coin);

/* HonestCoin */
coin = new Stablecoin();
coin.name = 'HonestCoin';
coin.symbol = 'USDH';
coin.scw.peg = '1 USD';
coin.scw.desc =
    'HonestCoin (USDH) describes themsleves as a fully regulated, 1 to 1 U.S. Dollar-backed \
stablecoin that can be bought, sold, invested in or spent as freely as you wish.';
coin.platforms.push(new Platform('Bitcoin Cash', 'c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479'));
glb_sc.push(coin);

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/
exports.getSCWStablecoins = async () => {
    return glb_sc;
}; // getSCWStablecoins()
