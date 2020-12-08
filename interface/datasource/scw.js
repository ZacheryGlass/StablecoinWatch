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
    buildList(self) {
        if (!self) self = this;
        let coin;
        let sc = [];

        /*-----------------------------------------------
        BITCNY
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'BITCNY';
        coin.scw.price = Number(self.currency_prices_in_usd.CNY.toFixed(3));
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
        coin.platforms.push(new Platform(
            'BNB Chain',
            'bnb100dxzy02a6k7vysc5g4kk4fqamr7jhjg4m83l0', /* TUSDB-888 */
            ['bnb100dxzy02a6k7vysc5g4kk4fqamr7jhjg4m83l0', 'bnb1hn8ym9xht925jkncjpf7lhjnax6z8nv24fv2yq']            
            )); 
        sc.push(coin);

        /*-----------------------------------------------
        Binance USD
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'BUSD';
        coin.platforms.push(new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53'));
        coin.platforms.push(new Platform(
            'BNB Chain',
            'bnb19v2ayq6k6e5x6ny3jdutdm6kpqn3n6mxheegvj', /* BUSD-BD1 */
            [
                'bnb19v2ayq6k6e5x6ny3jdutdm6kpqn3n6mxheegvj', /* Binance addresses */
                'bnb1v8vkkymvhe2sf7gd2092ujc6hweta38xadu2pj', 
                'bnb1skl4n4vrzx3ty9ujaut8rmkhkmtl4t04ysllfm', 
                'bnb1jxfh2g85q3v0tdq56fnevx6xcxtcnhtsmcu64m', 
                'bnb1ag3rpe9lten7fhyqg4cde9qusrv3dv67lsshup', 
                'bnb10zq89008gmedc6rrwzdfukjk94swynd7dl97w8', 
                'bnb1jzdy3vy3h0ux0j7qqcutfnsjm2xnsa5mru7gtj', 
                'bnb12jhtrzu60epy0vaggp9yvem6nzn2daep8tx5ed',
            ]            
            )); 
        sc.push(coin);

        /*-----------------------------------------------
        Tether USD
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'USDT';
        coin.platforms.push(new Platform(
            'Ethereum',
            '0xdac17f958d2ee523a2206206994597c13d831ec7',
            ['0x5754284f345afc66a98fbb0a0afe71e0f007b949']  /* Tether Treasury ERC20 */
        ));
        coin.platforms.push(new Platform(
            'Tron',
            'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            ['TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs'] /* Tether Treasury TRC20 */
        ));
        coin.platforms.push(new Platform(
            'Bitcoin',
            31,
            ['1NTMakcgVwQpMdGxRQnFKyb3G1FAJysSfz'] /* Tether Treasury Omni */
        ));
        coin.platforms.push(new Platform('Bitcoin (Liquid)', 'H4UWQS836njW4QJ6WfkGAPjaYtK2twLnZE'));
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
        coin.scw.price = Number(self.currency_prices_in_usd.EUR.toFixed(3));
        coin.platforms.push(new Platform(
            'Bitcoin',
            41,
            ['1NTMakcgVwQpMdGxRQnFKyb3G1FAJysSfz'] /* Tether Treasury Omni */
        ));
        coin.platforms.push(new Platform(
            'Ethereum',
            '0xabdf147870235fcfc34153828c769a70b3fae01f',
            ['0x5754284f345afc66a98fbb0a0afe71e0f007b949']  /* Tether Treasury ERC20 */
        ));
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
        coin.scw.price = Number(self.currency_prices_in_usd.CNY.toFixed(3));
        coin.platforms.push(new Platform(
            'Ethereum',
            '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef'
            ['0x5754284f345afc66a98fbb0a0afe71e0f007b949']  /* Tether Treasury ERC20 */
            ));
        coin.scw.desc = 'https://wallet.tether.to/transparency';
        coin.img_url = '/tether.png';
        sc.push(coin);

        /*-----------------------------------------------
        Tether Gold
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'Tether Gold';
        coin.symbol = 'XAUT';
        coin.platforms.push(new Platform(
            'Ethereum',
            '0x4922a015c4407F87432B179bb209e125432E4a2A',
            ['0x5754284f345afc66a98fbb0a0afe71e0f007b949']  /* Tether Treasury ERC20 */
        ));
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
        USDC
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.symbol = 'USDC';
        coin.platforms.push(
            new Platform(
                'Ethereum',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                ['0xAa05F7C7eb9AF63D6cC03C36c4f4Ef6c37431EE0'] // Blacklisted: https://www.centre.io/pdfs/attestation/grant-thornton_circle_usdc_reserves_20201123.pdf
        ));
        coin.platforms.push(new Platform('Algorand', '2UEQTE5QDNXPI7M3TU44G6SYKLFWLPQO7EBZM7K7MHMQQMFI4QJPLHQFHM', []));
        coin.platforms.push(new Platform('Solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
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

        /*-----------------------------------------------
        sUSD
        -----------------------------------------------*/
        coin = new Stablecoin();
        coin.name = 'Synthetix USD';
        coin.symbol = 'SUSD';
        coin.platforms.push(new Platform('Ethereum', '0x57ab1ec28d129707052df4df418d58a2d46d5f51', []));
        sc.push(coin);

        return sc;
    } /* buildList */

    /*---------------------------------------------------------
    Function:
            getCurrencyRates
    Description:
            Get fiat currency prices
    Note:   API limited to 1000/month (1/hour)
    ---------------------------------------------------------*/
    async getCurrencyRates(self) {
        if (!self) self = this;
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
        self.currency_prices_in_usd['EUR'] = eur_price_in_usd;

        /*-----------------------------------------------
        convert to USD price
        -----------------------------------------------*/
        Object.keys(eur_rates).forEach((currency) => {
            const x_price_in_eur = 1 / eur_rates[currency];
            self.currency_prices_in_usd[currency] = x_price_in_eur * eur_price_in_usd;
        });

        return self.currency_prices_in_usd;
    } /* getCurrencyRates */

    /*---------------------------------------------------------
    Function: sync
    Description:  This pulls the Messari API to build a list
                 of Stablecoins, as defined by CMC.
    ---------------------------------------------------------*/
    async sync(self) {
        if (!self) self = this;
        await self.getCurrencyRates(self);
        self.stablecoins = self.buildList(self);
        return;
    }
} /* StablecoinWatchInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = StablecoinWatchInterface;
