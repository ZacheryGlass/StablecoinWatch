/**
 * Centralized application configuration management
 * Supports multiple APIs and environments with validation and defaults
 */
class AppConfig {
    constructor(environment = process.env.NODE_ENV || 'development') {
        this.environment = environment;
        this._config = this._loadConfig();
        this._validateConfig();
    }

    /**
     * Load configuration from environment variables with defaults
     * @private
     * @returns {Object} Configuration object
     */
    _loadConfig() {
        return {
            // Server Configuration
            server: {
                port: parseInt(process.env.PORT) || 3000,
                host: process.env.HOST || 'localhost',
                environment: this.environment,
                logLevel: process.env.LOG_LEVEL || 'info'
            },

            // Data Update Configuration
            dataUpdate: {
                intervalMinutes: parseInt(process.env.UPDATE_INTERVAL_MINUTES) || 15,
                initialDelay: parseInt(process.env.INITIAL_DELAY_MS) || 0,
                retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
                retryDelayMs: parseInt(process.env.RETRY_DELAY_MS) || 1000,
                timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000
            },

            // Data Processing Configuration
            dataProcessing: {
                matchThreshold: parseFloat(process.env.MATCH_THRESHOLD) || 0.8,
                batchSize: parseInt(process.env.BATCH_SIZE) || 50,
                priceRange: {
                    min: parseFloat(process.env.MIN_STABLECOIN_PRICE) || 0.50,
                    max: parseFloat(process.env.MAX_STABLECOIN_PRICE) || 2.00
                },
                platformNameNormalization: {
                    enabled: process.env.NORMALIZE_PLATFORMS !== 'false',
                    caseInsensitive: process.env.CASE_INSENSITIVE_PLATFORMS !== 'false'
                }
            },

            // Health Monitoring Configuration
            health: {
                enabled: process.env.HEALTH_MONITORING !== 'false',
                checkIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 60000,
                degradedModeThreshold: parseFloat(process.env.DEGRADED_MODE_THRESHOLD) || 0.7,
                errorRateThreshold: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.3,
                responseTimeThreshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD_MS) || 10000,
                minimumHealthySources: parseInt(process.env.MIN_HEALTHY_SOURCES) || 1,
                retentionDays: parseInt(process.env.HEALTH_RETENTION_DAYS) || 7
            },

            // Circuit Breaker Configuration
            circuitBreaker: {
                enabled: process.env.CIRCUIT_BREAKER !== 'false',
                failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURES) || 6,
                timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS) || 60000,
                resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_MS) || 300000
            },

            // Memory Management Configuration
            memory: {
                cleanupEnabled: process.env.MEMORY_CLEANUP !== 'false',
                cleanupIntervalMs: parseInt(process.env.MEMORY_CLEANUP_INTERVAL_MS) || 300000,
                retainDebugObjects: process.env.RETAIN_DEBUG_OBJECTS === 'true',
                maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB) || 512
            },

            // Caching Configuration
            cache: {
                enabled: process.env.CACHING !== 'false',
                defaultTtlMs: parseInt(process.env.CACHE_DEFAULT_TTL_MS) || 300000,
                maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
                type: process.env.CACHE_TYPE || 'memory' // memory, redis
            },

            // Data Sources Configuration (API-specific configs loaded separately)
            dataSources: {
                enabled: this._parseEnabledSources(),
                priority: this._parseSourcePriority(),
                fallbackEnabled: process.env.FALLBACK_ENABLED !== 'false',
                parallelFetching: process.env.PARALLEL_FETCHING !== 'false'
            },

            // API Common Configuration
            api: {
                userAgent: process.env.USER_AGENT || 'StablecoinWatch/2.0',
                defaultTimeout: parseInt(process.env.API_DEFAULT_TIMEOUT_MS) || 15000,
                maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
                retryDelay: parseInt(process.env.API_RETRY_DELAY_MS) || 2000,
                rateLimitBuffer: parseFloat(process.env.RATE_LIMIT_BUFFER) || 0.8
            },

            // Development Configuration
            development: {
                debugMode: process.env.DEBUG_MODE === 'true',
                mockApis: process.env.MOCK_APIS === 'true',
                logRequests: process.env.LOG_REQUESTS === 'true',
                verbose: process.env.VERBOSE === 'true'
            }
        };
    }

    /**
     * Parse enabled data sources from environment
     * @private
     * @returns {Array<string>} Array of enabled source IDs
     */
    _parseEnabledSources() {
        const defaultSources = ['cmc', 'messari'];
        const envSources = process.env.ENABLED_SOURCES;
        
        if (!envSources) return defaultSources;
        
        return envSources.split(',').map(s => s.trim()).filter(s => s);
    }

    /**
     * Parse source priority configuration
     * @private
     * @returns {Object} Priority mapping
     */
    _parseSourcePriority() {
        const defaultPriority = {
            cmc: 10,      // CoinMarketCap - high priority for market data
            messari: 8,   // Messari - high priority for supply data
            coingecko: 6, // CoinGecko - medium priority
            defillama: 4  // DeFiLlama - lower priority
        };

        const envPriority = process.env.SOURCE_PRIORITY;
        if (!envPriority) return defaultPriority;

        try {
            return JSON.parse(envPriority);
        } catch (error) {
            console.warn('Invalid SOURCE_PRIORITY JSON, using defaults:', error.message);
            return defaultPriority;
        }
    }

    /**
     * Validate configuration and set warnings
     * @private
     */
    _validateConfig() {
        const warnings = [];

        // Validate server configuration
        if (this._config.server.port < 1024 || this._config.server.port > 65535) {
            warnings.push('Invalid server port, using default 3000');
            this._config.server.port = 3000;
        }

        // Validate data update interval
        if (this._config.dataUpdate.intervalMinutes < 1) {
            warnings.push('Update interval too short, minimum is 1 minute');
            this._config.dataUpdate.intervalMinutes = 1;
        }

        // Validate price range
        if (this._config.dataProcessing.priceRange.min >= this._config.dataProcessing.priceRange.max) {
            warnings.push('Invalid price range, using defaults');
            this._config.dataProcessing.priceRange = { min: 0.50, max: 2.00 };
        }

        // Validate match threshold
        if (this._config.dataProcessing.matchThreshold < 0 || this._config.dataProcessing.matchThreshold > 1) {
            warnings.push('Invalid match threshold, using default 0.8');
            this._config.dataProcessing.matchThreshold = 0.8;
        }

        // Validate health thresholds
        if (this._config.health.errorRateThreshold < 0 || this._config.health.errorRateThreshold > 1) {
            warnings.push('Invalid error rate threshold, using default 0.2');
            this._config.health.errorRateThreshold = 0.2;
        }

        // Check for missing essential configuration
        if (this._config.dataSources.enabled.length === 0) {
            warnings.push('No data sources enabled, application will not function properly');
        }

        // Store warnings
        this._warnings = warnings;

        // Log warnings in development
        if (this.environment === 'development' && warnings.length > 0) {
            console.warn('Configuration warnings:', warnings);
        }
    }

    /**
     * Get server configuration
     * @returns {Object} Server config
     */
    get server() {
        return { ...this._config.server };
    }

    /**
     * Get data update configuration
     * @returns {Object} Data update config
     */
    get dataUpdate() {
        return { ...this._config.dataUpdate };
    }

    /**
     * Get data processing configuration
     * @returns {Object} Data processing config
     */
    get dataProcessing() {
        return { ...this._config.dataProcessing };
    }

    /**
     * Get health monitoring configuration
     * @returns {Object} Health config
     */
    get health() {
        return { ...this._config.health };
    }

    /**
     * Get circuit breaker configuration
     * @returns {Object} Circuit breaker config
     */
    get circuitBreaker() {
        return { ...this._config.circuitBreaker };
    }

    /**
     * Get memory management configuration
     * @returns {Object} Memory config
     */
    get memory() {
        return { ...this._config.memory };
    }

    /**
     * Get caching configuration
     * @returns {Object} Cache config
     */
    get cache() {
        return { ...this._config.cache };
    }

    /**
     * Get data sources configuration
     * @returns {Object} Data sources config
     */
    get dataSources() {
        return { ...this._config.dataSources };
    }

    /**
     * Get API configuration
     * @returns {Object} API config
     */
    get api() {
        return { ...this._config.api };
    }

    /**
     * Get development configuration
     * @returns {Object} Development config
     */
    get development() {
        return { ...this._config.development };
    }

    /**
     * Get configuration warnings
     * @returns {Array<string>} Configuration warnings
     */
    get warnings() {
        return [...(this._warnings || [])];
    }

    /**
     * Check if a data source is enabled
     * @param {string} sourceId - Data source identifier
     * @returns {boolean} Whether source is enabled
     */
    isSourceEnabled(sourceId) {
        return this._config.dataSources.enabled.includes(sourceId);
    }

    /**
     * Get priority for a data source
     * @param {string} sourceId - Data source identifier
     * @returns {number} Priority (higher = preferred)
     */
    getSourcePriority(sourceId) {
        return this._config.dataSources.priority[sourceId] || 0;
    }

    /**
     * Check if running in development mode
     * @returns {boolean} Whether in development
     */
    isDevelopment() {
        return this.environment === 'development';
    }

    /**
     * Check if running in production mode
     * @returns {boolean} Whether in production
     */
    isProduction() {
        return this.environment === 'production';
    }

    /**
     * Get entire configuration object (read-only)
     * @returns {Object} Complete configuration
     */
    getAll() {
        return JSON.parse(JSON.stringify(this._config));
    }

    /**
     * Override configuration for testing
     * @param {Object} overrides - Configuration overrides
     */
    override(overrides) {
        if (this.environment !== 'test') {
            throw new Error('Configuration override only allowed in test environment');
        }
        
        this._config = { ...this._config, ...overrides };
    }
}

// Export singleton instance
module.exports = new AppConfig();
