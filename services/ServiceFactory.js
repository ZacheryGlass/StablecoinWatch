const DataFetcherRegistry = require('./DataFetcherRegistry');
const StablecoinDataService = require('./StablecoinDataService');

class ServiceFactory {
    static createDataService(healthMonitor = null) {
        const registry = DataFetcherRegistry.createDefault(healthMonitor);
        return new StablecoinDataService(healthMonitor, registry);
    }

    // Testing helper to inject custom fetchers
    static createDataServiceWithFetchers(fetchers = [], healthMonitor = null) {
        const registry = new (class {
            constructor(hm, list) { this.hm = hm; this._map = new Map(); list.forEach(f => this._map.set(f.getSourceId(), f)); }
            register() { return this; }
            get(id) { return this._map.get(id) || null; }
            getAll() { return Array.from(this._map.values()); }
            getActive() { return this.getAll().filter(f => f.isConfigured()); }
        })(healthMonitor, fetchers);
        return new StablecoinDataService(healthMonitor, registry);
    }
}

module.exports = ServiceFactory;
