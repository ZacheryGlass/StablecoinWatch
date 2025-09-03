/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const Platform = require('./platform');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class Stablecoin {
    /*---------------------------------------------------------
    Function:
            constructor
    Description:
            Creates a blank Stablecoin object.
    ---------------------------------------------------------*/
    constructor() {
        this.name = '';
        this.symbol = '';
        this.uri = '';
        this.img_url = null;
        this.platforms = [];
        this.main = {};
        this.msri = {};
        this.scw = {};
    } // constructor()

}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = Stablecoin;
