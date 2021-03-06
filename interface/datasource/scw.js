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
            or are missing data so they are manually tracked here.
         ***This should probably move to a database eventually***
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
        // audit: Jan. 4, 20201
        // https://core-api.real-time-attest.trustexplorer.io/TrueUSD/report/adad7a41-b83e-48b9-80db-120b36cb183b

        coin = new Stablecoin();
        coin.symbol = 'TUSD';
        coin.platforms.push(new Platform('Ethereum', '0x0000000000085d4780B73119b644AE5ecd22b376'));
        coin.platforms.push(new Platform(
            'Binance Chain',
            'TUSDB-888',
            ['bnb100dxzy02a6k7vysc5g4kk4fqamr7jhjg4m83l0', 'bnb1hn8ym9xht925jkncjpf7lhjnax6z8nv24fv2yq']            
            )); 
        sc.push(coin);

        /*-----------------------------------------------
        Binance USD
        -----------------------------------------------*/
        // audit: https://www.paxos.com/wp-content/uploads/2020/12/BUSD-Examination-Report-November-2020-1.pdf

        coin = new Stablecoin();
        coin.symbol = 'BUSD';
        coin.platforms.push(new Platform('Ethereum', '0x4fabb145d64652a948d72533023f6e7a623c7c53'));
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
        coin.platforms.push(new Platform('Solana', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'));

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
            '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef',
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
        coin.platforms.push(new Platform('Stellar', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'));
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
