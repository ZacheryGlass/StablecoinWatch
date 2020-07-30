/*---------------------------------------------------------
Function:    sleep
Description: pause execution for a specified 
amount of time
---------------------------------------------------------*/
exports.sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}; // sleep()

/*---------------------------------------------------------
Function:    toDollarString
Description: return a USD currency formated string
from a number input
---------------------------------------------------------*/
exports.toDollarString = (v) => {
    if (!v) return v;

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
            maximumFractionDigits: 0,
        }).format(v);
    }
}; // toDollarString()

/*---------------------------------------------------------
Function:    toDollarString
Description: remove HTML from a string of text
---------------------------------------------------------*/
exports.stripHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>?/gm, '');
}; // stripHTML()

/*---------------------------------------------------------
Function:       getTokenPlatform
Description: Return the platform from the token
type as input
---------------------------------------------------------*/
exports.getTokenPlatform = (token) => {
    if (typeof token !== 'string') return 'Unknown';

    if (token.toUpperCase().startsWith('ERC')) {
        return 'Ethereum';
    } else if (token.toUpperCase().startsWith('TRC')) {
        return 'Tron';
    } else if (token.toUpperCase().startsWith('BEP')) {
        return 'BNB Chain';
    } else if (token.toLowerCase() == 'omni') {
        return 'Bitcoin (Omni)';
    } else if (token.toLowerCase() == 'slp') {
        return 'Bitcoin Cash';
    } else if (token.toLowerCase() == 'native') {
        return 'Native';
    } else {
        return 'Unknown';
    }
}; // getTokenPlatform()
