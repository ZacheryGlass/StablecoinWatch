exports.sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}; // sleep()

exports.toDollarString = (v) => {
    if (!v) return '$0';

    const BILLION = 1000000000;
    const MILLION = 1000000;

    if (v >= BILLION) {
        return `$${(v / BILLION).toFixed(2)}B`;
    } else if (v >= MILLION) {
        return `$${(v / MILLION).toFixed(1)}M`;
    } else {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(v);
    }
}; // toDollarString()

exports.stripHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>?/gm, '');
}; // stripHTML()

exports.getTokenPlatform = (token) => {
    if (typeof token !== 'string') {
        return 'Unknown';
    }

    if (token.toUpperCase().startsWith('ERC')) {
        return 'Ethereum';
    } else if (token.toUpperCase().startsWith('TRC')) {
        return 'Tron';
    } else if (token.toUpperCase().startsWith('BEP')) {
        return 'Binance Chain';
    } else if (token.toLowerCase() == 'omni') {
        return 'Bitcoin';
    } else if (token.toLowerCase() == 'native') {
        return 'Native';
    } else {
        return 'Unknown';
    }
}; // getTokenPlatform()
