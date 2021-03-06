/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const cron = require('node-cron');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class DataSourceInterface {
    /*---------------------------------------------------------
    Rate at which the we will fetch the stablecoin data from 
    the datasource API - update rate is in mins
    ---------------------------------------------------------*/
    update_rate = null;

    /*---------------------------------------------------------
    List of stablecoin objects retrieved from the datasource
    ---------------------------------------------------------*/
    stablecoins = [];

    /*---------------------------------------------------------
    Function: constructor
    Description:
    ---------------------------------------------------------*/
    constructor(update_rate) {
        if (!update_rate) throw new Error('update_rate is required.');
        this.update_rate = update_rate;
        cron.schedule(`*/${update_rate} * * * *`, () => {
            this.sync(this);
        });
    }

    /*---------------------------------------------------------
    Function: sync
    Description: Fetch the stablecoins from the datasource API
        and save. The rate at which this fuction is call should
        be determined by the API rate limit. This function must
        be defined in the child class as it's implementation is
        API specific.
    ---------------------------------------------------------*/
    async sync(self) {
        throw new Error('Function sync is not defined in child class');
    } /* sync() */

    /*---------------------------------------------------------
    Function: getStablecoins
    Description: returns a list of stablecoins
    ---------------------------------------------------------*/
    async getStablecoins() {
        if (!this.stablecoins || this.stablecoins.length == 0) {
            await this.sync();
        }
        return this.stablecoins;
    }
}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = DataSourceInterface;
