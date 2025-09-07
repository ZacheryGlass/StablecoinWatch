const DataFetcherRegistry = require('./DataFetcherRegistry');
const StablecoinDataService = require('./StablecoinDataService');

class ServiceFactory {
    static createDataService(healthMonitor = null) {
        const registry = DataFetcherRegistry.createDefault(healthMonitor);
        return new StablecoinDataService(healthMonitor, registry);
    }
}

module.exports = ServiceFactory;

