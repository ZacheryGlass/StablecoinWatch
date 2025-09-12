const DataFetcherRegistry = require('./DataFetcherRegistry');
const StablecoinDataService = require('./StablecoinDataService');
const TransformerFactory = require('./TransformerFactory');

/**
 * Factory class for creating service instances with proper dependencies and dependency injection
 */
class ServiceFactory {
    /**
     * Create a data service with default configuration and injected transformer dependencies
     * @param {HealthMonitor} [healthMonitor=null] - Health monitoring service instance
     * @returns {StablecoinDataService} Configured data service instance with injected dependencies
     */
    static createDataService(healthMonitor = null) {
        const registry = DataFetcherRegistry.createDefault(healthMonitor);
        
        // Create transformer dependencies using factory
        const viewModelTransformer = TransformerFactory.createViewModelTransformer();
        const dataFormatter = TransformerFactory.createDataFormatter();
        
        return new StablecoinDataService(healthMonitor, registry, viewModelTransformer, dataFormatter);
    }

    /**
     * Testing helper to create data service with custom fetchers and transformer dependencies
     * @param {Array} [fetchers=[]] - Array of data fetcher instances
     * @param {HealthMonitor} [healthMonitor=null] - Health monitoring service instance
     * @param {IViewModelTransformer} [customTransformer=null] - Custom transformer for testing
     * @param {IDataFormatter} [customFormatter=null] - Custom formatter for testing
     * @returns {StablecoinDataService} Configured data service instance for testing
     */
    static createDataServiceWithFetchers(fetchers = [], healthMonitor = null, customTransformer = null, customFormatter = null) {
        const registry = new (class {
            constructor(hm, list) { this.hm = hm; this._map = new Map(); list.forEach(f => this._map.set(f.getSourceId(), f)); }
            register() { return this; }
            get(id) { return this._map.get(id) || null; }
            getAll() { return Array.from(this._map.values()); }
            getActive() { return this.getAll().filter(f => f.isConfigured()); }
        })(healthMonitor, fetchers);
        
        // Use custom or default transformer dependencies
        const viewModelTransformer = customTransformer || TransformerFactory.createViewModelTransformer();
        const dataFormatter = customFormatter || TransformerFactory.createDataFormatter();
        
        return new StablecoinDataService(healthMonitor, registry, viewModelTransformer, dataFormatter);
    }
}

module.exports = ServiceFactory;
