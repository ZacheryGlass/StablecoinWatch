class DataSourceInterface {
    url = null;

    /*---------------------------------------------------------
    Function:
            getStablecoins
    Description:
            Fetches all stablecoins from this datasource.
    ---------------------------------------------------------*/
    getStablecoins() {
        throw new Error('Function getStablecoins is not defined');
    }
}
