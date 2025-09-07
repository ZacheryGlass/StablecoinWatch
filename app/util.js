/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
const CLR = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function:
	sleep
Description:
	pause execution for a specified amount of time
---------------------------------------------------------*/
exports.sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}; // sleep()

/*---------------------------------------------------------
Function:
	toDollarString
Description:
	return a USD currency formated string from a
	number input
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
Function:
    sortObjByNumProperty

Description:
    Function generator. Returns a function to sort object
    by the specified object property. Also works for sorting
    based on nested object properties. The specified property
    values in the objects are assumed to be numbers and
    non-numbers be sorted to the end of the list.

Example Usage: 
    // sort by obj.out.in value
    myArray.sort( sortObjByNumProperty('out', 'in') )
    
            BEFORE               |        AFTER
_________________________________|________________________
[                                | [
    { out: { in: 261195293 } },  |   { out: { in: 261195293 } }, 
    NaN,                         |   { out: { in: 121905 } },    
    { out: { in: undefined } },  |   { out: { in: 27123 } },     
    { out: { in: 'string' } },   |   { out: { in: NaN } },       
    { out: {} },                 |   { out: { in: undefined } }, 
    'string',                    |   { out: { in: 'string' } },  
    { out: { in: null } },       |   { out: {} },                
    {},                          |   { out: { in: null } },      
    null,                        |   {},                         
    undefined,                   |   NaN,                        
    { out: { in: 121905 } },     |   'string',                   
    { out: { in: 27123 } },      |   null,                       
    { out: { in: NaN } },        |   undefined                   
]                                | ]
                                 |
---------------------------------------------------------*/

exports.sortObjByNumProperty = function (/* string: property, ... */) {
    let properies = Array.prototype.slice.call(arguments);

    let sorter = function (a, b) {
        /*----------------------------------------------------
        Get the specified nested object property for which to 
        sort by
        ----------------------------------------------------*/
        for (let i = 0; i < properies.length; i++) {
            // check for non-objects
            if (typeof a !== 'object' || a === null) return 1;
            if (typeof b !== 'object' || b === null) return -1;

            a = a[properies[i]];
            b = b[properies[i]];
        }

        /*----------------------------------------------------
        check for non-numbers properties
        ----------------------------------------------------*/
        if (typeof a !== 'number') return 1;
        if (typeof b !== 'number') return -1;

        /*----------------------------------------------------
        check for property value NaN
        ----------------------------------------------------*/
        if (a !== a) return 1;
        if (b !== b) return -1;

        /*----------------------------------------------------
        if all safty checks pass, sort based on number value
        ----------------------------------------------------*/
        return b - a;
    };

    /*----------------------------------------------------
    return the generated sort function 
    ----------------------------------------------------*/
    return sorter;
};

/*---------------------------------------------------------
Function:
	stripHTML
Description:
	Remove HTML from a string of text
---------------------------------------------------------*/
exports.stripHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>?/gm, '');
}; // stripHTML()

/*---------------------------------------------------------
Function:
	getTokenPlatform
Description:
	Return the platform from the token type as input
---------------------------------------------------------*/
exports.getTokenPlatform = (token) => {
    if (typeof token !== 'string') return 'unknown';

    if (token.toUpperCase().startsWith('ERC')) {
        return 'ethereum';
    } else if (token.toUpperCase().startsWith('TRC')) {
        return 'tron';
    } else if (token.toUpperCase().startsWith('BEP')) {
        return 'binance-smart-chain';
    } else if (token.toLowerCase() == 'omni') {
        return 'bitcoin';
    } else if (token.toLowerCase() == 'slp') {
        return 'bitcoin-cash';
    } else if (token.toLowerCase() == 'native') {
        return 'native';
    } else {
        return 'unknown';
    }
}; // getTokenPlatform()

/*---------------------------------------------------------
Function:
	urlify
Description:
	add <a> html tags around urls in a text block
---------------------------------------------------------*/
exports.urlify = (text) => {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function (url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
    // return text.replace(urlRegex, '<a href="$1">$1</a>')
};

/*---------------------------------------------------------
Function: 
        print_custom
Description:
        Print a message to the console in a specified
        color with a specified prefix.
---------------------------------------------------------*/
const print_custom = function (clr, prefix, msgs) {
    if (global.DEBUG) process.stdout.write(clr);

    process.stdout.write(prefix + ':');
    for (let i = 0; i < msgs.length; i++) {
        process.stdout.write(' ');
        process.stdout.write('' + msgs[i]);
    }
    process.stdout.write('\n');

    if (global.DEBUG) process.stdout.write(CLR.reset);
};

/*---------------------------------------------------------
Function: console.warn
Description: Print warnings to the console
---------------------------------------------------------*/
console.warn = function () {
    print_custom(CLR.yellow, 'WARNING', arguments);
};

/*---------------------------------------------------------
Function: console.info
Description: Print info to the console
---------------------------------------------------------*/
console.info = function () {
    print_custom(CLR.green, 'INFO', arguments);
};

/*---------------------------------------------------------
Function: console.error
Description: Print errors to the console
---------------------------------------------------------*/
console.error = function () {
    print_custom(CLR.red, 'ERROR', arguments);
};

/*---------------------------------------------------------
Function: console.error
Description: Print errors to the console
---------------------------------------------------------*/
console.debug = function () {
    if (global.DEBUG) print_custom(CLR.cyan, 'DEBUG', arguments);
};
