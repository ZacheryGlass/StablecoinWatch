/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const Stablecoin = require('../../models/stablecoin');
const Platform = require('../../models/platform');
const keys = require('../../app/keys');
const util = require('../../app/util');
const DataSourceInterface = require('./datasource_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class StablecoinWatchInterface extends DataSourceInterface {
    currency_prices_in_usd = {};

    /*---------------------------------------------------------
    Function:   constructor
    Description: call super class constructor
    ---------------------------------------------------------*/
    constructor(update_rate) {
        super(update_rate);
    }

    /*---------------------------------------------------------
    Function:
            buildList
    Description:
            Get coins tracked by StablecoinWatch.
    Note:   Many stablecoins are not tracked by other datasources,
            or are missing data so they are manually tracked here
    ---------------------------------------------------------*/
    buildList() {
        let coin;
        let sc = [];

        /*-----------------------------------------------
        BITCNY
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'BITCNY';
        coin.scw.price = Number(this.currency_prices_in_usd.CNY.toFixed(3));
        sc.push(coin);

        /*-----------------------------------------------
        StableUSD / Stably
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'USDS';
        coin.platforms.push(new Platform('Ethereum', '0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe'));
        sc.push(coin);

        /*-----------------------------------------------
        True USD
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'TUSD';
        coin.platforms.push(new Platform('Ethereum', '0x0000000000085d4780B73119b644AE5ecd22b376'));
        sc.push(coin);

        /*-----------------------------------------------
        Binance USD
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'BUSD';
        coin.platforms.push(new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53'));
        sc.push(coin);

        /*-----------------------------------------------
        Tether USD
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'USDT';
        coin.platforms.push(new Platform('Tron', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'));
        coin.platforms.push(new Platform('Bitcoin', 31));
        coin.platforms.push(new Platform('Bitcoin (Liquid)', 'Tether USD'));
        coin.platforms.push(new Platform('EOS', 'tethertether'));
        coin.platforms.push(new Platform('Algorand', 'XIU7HGGAJ3QOTATPDSIIHPFVKMICXKHMOR2FJKHTVLII4FAOA3CYZQDLG4'));
        coin.platforms.push(
            new Platform('Bitcoin Cash', '9fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c11')
        );
        sc.push(coin);

        /*-----------------------------------------------
        Tether EUR
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'Tether EUR';
        coin.symbol = 'EURT';
        coin.scw.price = Number(this.currency_prices_in_usd.EUR.toFixed(3));
        coin.platforms.push(new Platform('Ethereum', '0xabdf147870235fcfc34153828c769a70b3fae01f'));
        coin.platforms.push(new Platform('Bitcoin', 41));
        coin.scw.desc = `Tether is fiat-collateralized stablecoin that offers individuals the
                        advantages of transacting with blockchain-based assets while mitigating price risk.
                        Tether is primarily issued on the Ethereum and Bitcoin blockchains and corresponds on
                        a 1:1 basis with Euros sitting in bank accounts.`;
        coin.img_url = '/tether.png';
        sc.push(coin);

        /*-----------------------------------------------
        Tether CNH
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'Tether CNH';
        coin.symbol = 'CNHT';
        coin.scw.price = Number(this.currency_prices_in_usd.CNY.toFixed(3));
        coin.platforms.push(new Platform('Ethereum', '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef'));
        coin.scw.desc = 'https://wallet.tether.to/transparency';
        coin.img_url = '/tether.png';
        sc.push(coin);

        /*-----------------------------------------------
        Token Gold
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'Token Gold';
        coin.symbol = 'XAUT';
        coin.platforms.push(new Platform('Ethereum', '0x4922a015c4407F87432B179bb209e125432E4a2A'));
        coin.scw.desc = util.urlify(
            `Tether Gold (XAUT) is a cryptocurrency with a value meant to mirror the value of
                the Gold. According to their site, Tether converts  cash into digital currency, to
                anchor or “tether” the value of the coin to the price of assets or national
                currencies like the US dollar, the Euro, and the Yen. Tether Gold (XAUT) is
                issued on the Ethereum blockchain. For details on the issuance please refer to:
                https://wallet.tether.to/transparency`
        );
        coin.img_url = '/tether-gold-logo.svg';
        sc.push(coin);

        /*-----------------------------------------------
        HonestCoin
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'HonestCoin';
        coin.symbol = 'USDH';
        coin.img_url = '/default-logo.png';
        coin.scw.price = 1;
        coin.scw.desc = `HonestCoin (USDH) describes themsleves as a fully regulated, 1 to 1 U.S. Dollar-backed
            stablecoin that can be bought, sold, invested in or spent as freely as you wish.`;
        coin.platforms.push(
            new Platform('Bitcoin Cash', 'c4b0d62156b3fa5c8f3436079b5394f7edc1bef5dc1cd2f9d0c4d46f82cca479')
        );
        sc.push(coin);

        /*-----------------------------------------------
        Serum
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'SerumUSD';
        coin.symbol = 'SRM';
        coin.scw.desc =
            'SerumUSD is Serum’s SPL and ERC20 USD stablecoin. A decentralized stable coin with no single point of failure.';
        coin.platforms.push(new Platform('Ethereum', '0x476c5e26a75bd202a9683ffd34359c0cc15be0ff'));
        sc.push(coin);

        /*-----------------------------------------------
        Reserve
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'Reserve';
        coin.symbol = 'RSV';
        coin.img_url = '/default-logo.png';
        coin.scw.price = 1;
        coin.scw.desc = `Reserve is a stable cryptocurrency that is economically and legally robust at any scale. Decentralized,
            100% asset-backed, and funded by top Silicon Valley investors.`;
        coin.platforms.push(new Platform('Ethereum', '0x1c5857e110cd8411054660f60b5de6a6958cfae2'));
        sc.push(coin);

        /*-----------------------------------------------
        QCash
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'QC';
        coin.platforms.push(
            new Platform(
                'Qtum',
                'f2033ede578e17fa6231047265010445bca8cf1c',
                ['QQCsHgSmAgBK3sCeUF9Whzm7qgFURuuSAk'],
                10000000000
            )
        );
        sc.push(coin);
        return sc;
    } /* buildList */

    /*---------------------------------------------------------
    Function:
            getCurrencyRates
    Description:
            TODO
    Note:   API limited to 1000/month (1/hour)
    ---------------------------------------------------------*/
    async getCurrencyRates() {
        let eur_rates;

        if (global.DEBUG) {
            eur_rates = {
                USD: 1.175164,
                CNY: 8.229685,
                CHF: 1.074921,
            };
        } else {
            eur_rates = await fetch(`http://data.fixer.io/api/latest?access_key=${keys.fixer}`)
                .then((data) => data.json())
                .then((resp) => resp.rates);
        }

        const eur_price_in_usd = eur_rates.USD;
        this.currency_prices_in_usd['EUR'] = eur_price_in_usd;

        /*-----------------------------------------------
        convert to USD price
        -----------------------------------------------*/
        Object.keys(eur_rates).forEach((currency) => {
            const x_price_in_eur = 1 / eur_rates[currency];
            this.currency_prices_in_usd[currency] = x_price_in_eur * eur_price_in_usd;
        });

        return this.currency_prices_in_usd;
    } /* getCurrencyRates */

    /*---------------------------------------------------------
    Function: sync
    Description:  This pulls the Messari API to build a list
                 of Stablecoins, as defined by CMC.
    ---------------------------------------------------------*/
    async sync() {
        await this.getCurrencyRates();
        this.stablecoins = this.buildList();
        return;
    }
} /* StablecoinWatchInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = StablecoinWatchInterface;
