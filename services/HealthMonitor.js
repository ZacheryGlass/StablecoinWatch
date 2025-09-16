const IHealthMonitor = require('../interfaces/IHealthMonitor');
const AppConfig = require('../config/AppConfig');

/**
 * Health monitoring implementation for multi-API architecture.
 * Tracks performance, errors, and health status for all data sources with circuit breaker functionality.
 * 
 * @class HealthMonitor
 * @extends IHealthMonitor
 * 
 * Features:
 * - Real-time health monitoring for multiple data sources
 * - Circuit breaker pattern implementation
 * - Performance metrics tracking with percentile calculations
 * - Automated alert generation and management
 * - Degraded mode detection and recommendations
 * - Data quality scoring and freshness tracking
 * 
 * @example
 * const healthMonitor = new HealthMonitor();
 * await healthMonitor.recordSuccess('cmc', { duration: 250, recordCount: 100 });
 * const systemHealth = await healthMonitor.getSystemHealth();
 */
class HealthMonitor extends IHealthMonitor {
    /**
     * Creates a new HealthMonitor instance and initializes all monitoring systems.
     * Automatically starts health monitoring if enabled in configuration.
     * 
     * @constructor
     * @throws {Error} If configuration is invalid or required dependencies are missing
     */
    constructor() {
        super();
        this.config = AppConfig.health;
        
        // In-memory storage for health data (could be moved to Redis/DB later)
        this.healthData = new Map(); // sourceId -> HealthData
        this.systemMetrics = {
            startTime: Date.now(),
            totalRequests: 0,
            totalErrors: 0,
            responseTimeSum: 0,
            lastSystemCheck: Date.now()
        };
        
        // Conflict tracking metrics
        this.conflictMetrics = {
            totalConflicts: 0,
            conflictsByField: {},
            conflictsByAsset: {},
            conflictsByType: {},
            conflictTrends: [], // historical data points
            lastConflictTime: null,
            conflictRate: 0, // conflicts per hour
            peakConflictPeriods: [], // time periods with high conflicts
            threshold: {
                maxConflictsPerHour: parseInt(process.env.MAX_CONFLICTS_PER_HOUR) || 50,
                maxConflictsPerAsset: parseInt(process.env.MAX_CONFLICTS_PER_ASSET) || 5,
                alertThreshold: parseFloat(process.env.CONFLICT_ALERT_THRESHOLD) || 0.1 // 10% of assets having conflicts
            }
        };
        
        // Performance tracking windows (circular buffers)
        this.performanceWindows = new Map(); // sourceId -> CircularBuffer
        
        // Active alerts
        this.activeAlerts = new Map(); // alertId -> HealthAlert
        
        // Circuit breaker states
        this.circuitBreakers = new Map(); // sourceId -> CircuitBreakerState
        
        // Start health monitoring if enabled
        if (this.config.enabled) {
            this._startHealthMonitoring();
        }
    }

    /**
     * Starts periodic health monitoring by setting up intervals for health checks and data cleanup.
     * Creates two intervals: one for system health checks and another for cleaning up old data.
     * 
     * @private
     * @returns {void}
     */
    _startHealthMonitoring() {
        // Periodic health checks
        setInterval(() => {
            this._performSystemHealthCheck();
        }, this.config.checkIntervalMs);
        
        // Cleanup old data
        setInterval(() => {
            this._cleanupOldData();
        }, 3600000); // Every hour
    }

    /**
     * Initializes health tracking for a data source if not already initialized.
     * Creates comprehensive health data structure, performance window, and circuit breaker state.
     * Safe to call multiple times - will not overwrite existing data.
     * 
     * @param {string} sourceId - Unique identifier for the data source (e.g., 'cmc', 'messari')
     * @returns {void}
     * @throws {TypeError} If sourceId is not a string or is empty
     * 
     * @example
     * healthMonitor.initializeSource('cmc');
     * healthMonitor.initializeSource('messari');
     */
    initializeSource(sourceId) {
        if (!this.healthData.has(sourceId)) {
            this.healthData.set(sourceId, {
                sourceId,
                operational: true,
                healthScore: 100,
                lastSuccessfulOperation: null,
                consecutiveFailures: 0,
                totalRequests: 0,
                successfulRequests: 0,
                lastError: null,
                responseTime: {
                    current: 0,
                    average: 0,
                    samples: []
                },
                errorMetrics: {
                    errorRate: 0,
                    errorCount: 0,
                    errorTypes: {},
                    recentErrors: []
                },
                rateLimit: {
                    active: false,
                    remaining: null,
                    limit: null,
                    resetTime: null,
                    exceeded: false
                },
                dataQuality: {
                    completenessScore: 1,
                    consistencyScore: 1,
                    freshnessScore: 1,
                    qualityIssues: [],
                    recordCount: 0
                }
            });
            
            // Initialize performance window
            this.performanceWindows.set(sourceId, new CircularBuffer(1000)); // Last 1000 operations
            
            // Initialize circuit breaker
            this.circuitBreakers.set(sourceId, {
                state: 'closed',
                failureCount: 0,
                nextRetryTime: null,
                successCount: 0
            });
        }
    }

    /**
     * Retrieves comprehensive system health status including all monitored sources.
     * Aggregates health data from all sources and calculates system-wide metrics.
     * 
     * @async
     * @returns {Promise<Object>} Complete system health overview containing:
     * @returns {Promise<Object>} returns.status - Overall system status ('healthy', 'degraded', 'critical', 'down')
     * @returns {Promise<boolean>} returns.operational - Whether system meets minimum operational requirements
     * @returns {Promise<number>} returns.overallScore - Aggregated health score (0-100)
     * @returns {Promise<Array<Object>>} returns.sources - Health status for each monitored source
     * @returns {Promise<Object>} returns.metrics - System-wide performance metrics
     * @returns {Promise<Array<Object>>} returns.activeAlerts - Current active alerts
     * @returns {Promise<Object>} returns.degradedMode - Degraded mode status and recommendations
     * @returns {Promise<number>} returns.timestamp - When this health check was performed
     * @returns {Promise<string>} returns.uptime - System uptime in human-readable format
     * 
     * @example
     * const systemHealth = await healthMonitor.getSystemHealth();
     * console.log(`System is ${systemHealth.operational ? 'operational' : 'down'}`);
     * console.log(`Overall score: ${systemHealth.overallScore}/100`);
     */
    async getSystemHealth() {
        const sources = [];
        const activeAlerts = Array.from(this.activeAlerts.values());
        
        let healthySources = 0;
        let totalScore = 0;
        let sourceCount = 0;
        
        for (const [sourceId, data] of this.healthData) {
            const sourceHealth = this._calculateSourceHealth(sourceId, data);
            sources.push(sourceHealth);
            
            if (sourceHealth.operational) {
                healthySources++;
            }
            
            totalScore += sourceHealth.healthScore;
            sourceCount++;
        }
        
        let overallScore = sourceCount > 0 ? totalScore / sourceCount : 0;
        
        // Apply conflict penalty to overall score
        if (this.systemMetrics.conflictHealthPenalty) {
            overallScore = Math.max(0, overallScore - this.systemMetrics.conflictHealthPenalty);
        }
        
        const degradedMode = await this.checkDegradedMode();
        const conflictMetrics = await this.getConflictMetrics();
        
        return {
            status: this._determineSystemStatus(overallScore, healthySources, sourceCount),
            operational: healthySources >= this.config.minimumHealthySources,
            overallScore: Math.round(overallScore),
            sources,
            metrics: {
                totalRequests: this.systemMetrics.totalRequests,
                successRate: this._calculateSystemSuccessRate(),
                averageResponseTime: this._calculateSystemAverageResponseTime(),
                dataFreshness: this._calculateSystemDataFreshness(),
                sourceCount,
                healthySourceCount: healthySources
            },
            conflicts: conflictMetrics,
            activeAlerts,
            degradedMode,
            timestamp: Date.now(),
            uptime: this._getUptime()
        };
    }

    /**
     * Retrieves detailed health status for a specific data source.
     * Returns comprehensive metrics including response times, error rates, and circuit breaker status.
     * 
     * @async
     * @param {string} sourceId - Unique identifier for the data source to query
     * @returns {Promise<Object>} Detailed health status object containing:
     * @returns {Promise<string>} returns.sourceId - The source identifier
     * @returns {Promise<string>} returns.sourceName - Human-readable source name
     * @returns {Promise<string>} returns.status - Source status ('healthy', 'degraded', 'critical', 'down')
     * @returns {Promise<boolean>} returns.operational - Whether source is currently operational
     * @returns {Promise<number>} returns.healthScore - Health score from 0-100
     * @returns {Promise<Object>} returns.responseTime - Response time metrics with percentiles
     * @returns {Promise<Object>} returns.errorMetrics - Error tracking information
     * @returns {Promise<Object>} returns.circuitBreaker - Circuit breaker state information
     * @throws {Error} If the specified sourceId has not been initialized
     * 
     * @example
     * try {
     *   const cmcHealth = await healthMonitor.getSourceHealth('cmc');
     *   console.log(`CMC Health Score: ${cmcHealth.healthScore}`);
     * } catch (error) {
     *   console.error('Source not found:', error.message);
     * }
     */
    async getSourceHealth(sourceId) {
        const data = this.healthData.get(sourceId);
        if (!data) {
            throw new Error(`Unknown data source: ${sourceId}`);
        }
        
        return this._calculateSourceHealth(sourceId, data);
    }

    /**
     * Records a successful operation for health monitoring and updates all related metrics.
     * Updates success counters, response times, data quality scores, and circuit breaker state.
     * 
     * @async
     * @param {string} sourceId - Unique identifier for the data source
     * @param {Object} metrics - Operation performance and quality metrics
     * @param {number} [metrics.duration] - Operation duration in milliseconds
     * @param {number} [metrics.timestamp] - Operation timestamp (defaults to current time)
     * @param {string} [metrics.operation] - Type of operation performed
     * @param {number} [metrics.recordCount] - Number of records processed in this operation
     * @returns {Promise<void>}
     * @throws {TypeError} If sourceId is not provided or metrics is not an object
     * 
     * @example
     * await healthMonitor.recordSuccess('cmc', {
     *   duration: 1250,
     *   recordCount: 150,
     *   operation: 'fetchStablecoins',
     *   timestamp: Date.now()
     * });
     */
    async recordSuccess(sourceId, metrics) {
        this.initializeSource(sourceId);
        
        const data = this.healthData.get(sourceId);
        const window = this.performanceWindows.get(sourceId);
        
        // Update basic metrics
        data.lastSuccessfulOperation = metrics.timestamp || Date.now();
        data.consecutiveFailures = 0;
        data.totalRequests++;
        data.successfulRequests++;
        
        // Update response time
        if (metrics.duration) {
            data.responseTime.current = metrics.duration;
            data.responseTime.samples.push({
                timestamp: metrics.timestamp || Date.now(),
                duration: metrics.duration
            });
            
            // Keep only recent samples (last hour)
            const oneHourAgo = Date.now() - 3600000;
            data.responseTime.samples = data.responseTime.samples.filter(s => s.timestamp > oneHourAgo);
            
            // Calculate average
            if (data.responseTime.samples.length > 0) {
                const sum = data.responseTime.samples.reduce((acc, s) => acc + s.duration, 0);
                data.responseTime.average = sum / data.responseTime.samples.length;
            }
        }
        
        // Update data quality
        if (metrics.recordCount !== undefined) {
            data.dataQuality.recordCount = metrics.recordCount;
            data.dataQuality.freshnessScore = 1; // Fresh data
        }
        
        // Record in performance window
        window.add({
            timestamp: metrics.timestamp || Date.now(),
            success: true,
            duration: metrics.duration || 0,
            operation: metrics.operation,
            recordCount: metrics.recordCount || 0
        });
        
        // Update system metrics
        this.systemMetrics.totalRequests++;
        if (metrics.duration) {
            this.systemMetrics.responseTimeSum += metrics.duration;
        }
        
        // Update circuit breaker
        this._updateCircuitBreaker(sourceId, true);
        
        // Update health score
        this._updateHealthScore(sourceId);
        
        // Check for alerts to clear
        this._checkAlertResolution(sourceId);
    }

    /**
     * Records a failed operation for health monitoring and updates error tracking.
     * Updates failure counters, error rates, circuit breaker state, and generates alerts when needed.
     * 
     * @async
     * @param {string} sourceId - Unique identifier for the data source
     * @param {Object} error - Error information and context
     * @param {string} error.message - Human-readable error message
     * @param {string} error.errorType - Classification of error (e.g., 'network', 'auth', 'timeout')
     * @param {number} [error.statusCode] - HTTP status code if applicable
     * @param {boolean} [error.retryable] - Whether this error type is retryable
     * @param {number} [error.timestamp] - Error timestamp (defaults to current time)
     * @param {string} [error.operation] - Operation that failed
     * @returns {Promise<void>}
     * @throws {TypeError} If sourceId is not provided or error is not an object
     * 
     * @example
     * await healthMonitor.recordFailure('messari', {
     *   message: 'Rate limit exceeded',
     *   errorType: 'rate_limit',
     *   statusCode: 429,
     *   retryable: true,
     *   operation: 'fetchAssetMetrics'
     * });
     */
    async recordFailure(sourceId, error) {
        this.initializeSource(sourceId);
        
        const data = this.healthData.get(sourceId);
        const window = this.performanceWindows.get(sourceId);
        
        // Update basic metrics
        data.consecutiveFailures++;
        data.totalRequests++;
        data.lastError = error.message;
        
        // Update error metrics
        data.errorMetrics.errorCount++;
        data.errorMetrics.errorTypes[error.errorType] = 
            (data.errorMetrics.errorTypes[error.errorType] || 0) + 1;
        
        data.errorMetrics.recentErrors.push({
            timestamp: error.timestamp || Date.now(),
            type: error.errorType,
            message: error.message,
            statusCode: error.statusCode,
            retryable: error.retryable
        });
        
        // Keep only recent errors (last 24 hours)
        const oneDayAgo = Date.now() - 86400000;
        data.errorMetrics.recentErrors = data.errorMetrics.recentErrors
            .filter(e => e.timestamp > oneDayAgo);
        
        // Calculate error rate
        if (data.totalRequests > 0) {
            data.errorMetrics.errorRate = 
                (data.totalRequests - data.successfulRequests) / data.totalRequests;
        }
        
        // Record in performance window
        window.add({
            timestamp: error.timestamp || Date.now(),
            success: false,
            duration: 0,
            operation: error.operation,
            errorType: error.errorType,
            retryable: error.retryable
        });
        
        // Update system metrics
        this.systemMetrics.totalRequests++;
        this.systemMetrics.totalErrors++;
        
        // Update circuit breaker
        this._updateCircuitBreaker(sourceId, false);
        
        // Update health score
        this._updateHealthScore(sourceId);
        
        // Check for new alerts
        this._checkForAlerts(sourceId, error);
    }

    /**
     * Analyzes system health to determine if degraded mode should be activated.
     * Evaluates multiple criteria including healthy source count, error rates, and response times.
     * 
     * @async
     * @returns {Promise<Object>} Degraded mode analysis containing:
     * @returns {Promise<boolean>} returns.recommended - Whether degraded mode is recommended
     * @returns {Promise<boolean>} returns.active - Whether degraded mode is currently active
     * @returns {Promise<Array<string>>} returns.reasons - List of reasons why degraded mode is recommended
     * @returns {Promise<Array<string>>} returns.disabledSources - Sources that are not operational
     * @returns {Promise<Object>} returns.config - Current degraded mode configuration thresholds
     * 
     * @example
     * const degradedStatus = await healthMonitor.checkDegradedMode();
     * if (degradedStatus.recommended) {
     *   console.log('Degraded mode recommended:', degradedStatus.reasons.join(', '));
     * }
     */
    async checkDegradedMode() {
        const healthySources = Array.from(this.healthData.values())
            .filter(data => data.operational).length;
        
        const totalSources = this.healthData.size;
        const systemErrorRate = this._calculateSystemErrorRate();
        const avgResponseTime = this._calculateSystemAverageResponseTime();
        
        const reasons = [];
        let recommended = false;
        
        // Check minimum healthy sources
        if (healthySources < this.config.minimumHealthySources) {
            reasons.push(`Only ${healthySources} healthy sources (minimum: ${this.config.minimumHealthySources})`);
            recommended = true;
        }
        
        // Check system error rate
        if (systemErrorRate > this.config.errorRateThreshold) {
            reasons.push(`High system error rate: ${(systemErrorRate * 100).toFixed(1)}%`);
            recommended = true;
        }
        
        // Check response time
        if (avgResponseTime > this.config.responseTimeThreshold) {
            reasons.push(`High average response time: ${avgResponseTime}ms`);
            recommended = true;
        }
        
        return {
            recommended,
            active: false, // This would be set by the service layer
            reasons,
            disabledSources: Array.from(this.healthData.entries())
                .filter(([_, data]) => !data.operational)
                .map(([sourceId, _]) => sourceId),
            config: {
                errorThreshold: this.config.errorRateThreshold,
                responseTimeThreshold: this.config.responseTimeThreshold,
                minimumSources: this.config.minimumHealthySources,
                essentialSources: [] // Could be configured
            }
        };
    }

    /**
     * Retrieves active health alerts filtered by minimum severity level.
     * Returns alerts sorted by severity (most critical first).
     * 
     * @async
     * @param {string} [level='info'] - Minimum alert level to include ('info', 'warning', 'error', 'critical')
     * @returns {Promise<Array<Object>>} Array of active health alerts, each containing:
     * @returns {Promise<Array<Object>>} returns[].id - Unique alert identifier
     * @returns {Promise<Array<string>>} returns[].level - Alert severity level
     * @returns {Promise<Array<string>>} returns[].type - Alert type classification
     * @returns {Promise<Array<string>>} returns[].source - Source that triggered the alert
     * @returns {Promise<Array<string>>} returns[].title - Alert title
     * @returns {Promise<Array<string>>} returns[].description - Detailed alert description
     * @returns {Promise<Array<number>>} returns[].timestamp - When alert was created
     * @returns {Promise<Array<boolean>>} returns[].active - Whether alert is still active
     * @returns {Promise<Array<Object>>} returns[].metadata - Additional alert context
     * @returns {Promise<Array<Array<string>>>} returns[].actions - Recommended remediation actions
     * 
     * @example
     * const criticalAlerts = await healthMonitor.getHealthAlerts('error');
     * criticalAlerts.forEach(alert => {
     *   console.log(`${alert.level.toUpperCase()}: ${alert.title} - ${alert.description}`);
     * });
     */
    async getHealthAlerts(level = 'info') {
        const levelPriority = { info: 0, warning: 1, error: 2, critical: 3 };
        const minPriority = levelPriority[level] || 0;
        
        return Array.from(this.activeAlerts.values())
            .filter(alert => levelPriority[alert.level] >= minPriority)
            .sort((a, b) => levelPriority[b.level] - levelPriority[a.level]);
    }

    /**
     * Records conflict metrics from the data service for health monitoring.
     * Integrates conflict tracking into the health monitoring system.
     * 
     * @async
     * @param {Object} conflictData - Conflict metrics from StablecoinDataService
     * @param {number} conflictData.totalConflicts - Total conflicts detected
     * @param {Object} conflictData.conflictsByField - Conflicts grouped by field
     * @param {Object} conflictData.conflictsByAsset - Conflicts grouped by asset
     * @param {number} conflictData.lastConflictTime - Timestamp of last conflict
     * @param {number} [assetCount] - Total number of assets for rate calculations
     * @returns {Promise<void>}
     * 
     * @example
     * const dataService = services.dataService;
     * const conflictData = dataService.getConflictMetrics();
     * await healthMonitor.recordConflictMetrics(conflictData, assetCount);
     */
    async recordConflictMetrics(conflictData, assetCount = 0) {
        // Update conflict metrics
        this.conflictMetrics.totalConflicts = conflictData.totalConflicts || 0;
        this.conflictMetrics.conflictsByField = { ...conflictData.conflictsByField };
        this.conflictMetrics.conflictsByAsset = { ...conflictData.conflictsByAsset };
        this.conflictMetrics.lastConflictTime = conflictData.lastConflictTime;

        // Calculate conflict rate (conflicts per hour)
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        
        // Add current data point to trends
        this.conflictMetrics.conflictTrends.push({
            timestamp: now,
            totalConflicts: this.conflictMetrics.totalConflicts,
            assetCount: assetCount,
            conflictRate: assetCount > 0 ? this.conflictMetrics.totalConflicts / assetCount : 0
        });

        // Keep only last 24 hours of trend data
        this.conflictMetrics.conflictTrends = this.conflictMetrics.conflictTrends
            .filter(trend => trend.timestamp > now - 86400000);

        // Calculate current conflict rate
        const recentTrends = this.conflictMetrics.conflictTrends
            .filter(trend => trend.timestamp > oneHourAgo);
        
        if (recentTrends.length > 1) {
            const oldestTrend = recentTrends[0];
            const newestTrend = recentTrends[recentTrends.length - 1];
            const conflictIncrease = newestTrend.totalConflicts - oldestTrend.totalConflicts;
            const timeDiff = (newestTrend.timestamp - oldestTrend.timestamp) / 3600000; // hours
            this.conflictMetrics.conflictRate = timeDiff > 0 ? conflictIncrease / timeDiff : 0;
        }

        // Check for conflict-based alerts
        this._checkConflictAlerts(assetCount);

        // Update health scoring with conflict impact
        this._updateSystemHealthScoreForConflicts();
    }

    /**
     * Retrieves comprehensive conflict metrics and trends for health status.
     * 
     * @async
     * @returns {Promise<Object>} Conflict metrics summary containing:
     * @returns {Promise<number>} returns.totalConflicts - Total conflicts detected
     * @returns {Promise<number>} returns.conflictRate - Conflicts per hour
     * @returns {Promise<Object>} returns.conflictsByField - Field-specific conflict counts
     * @returns {Promise<Object>} returns.conflictsByAsset - Asset-specific conflict counts
     * @returns {Promise<Array>} returns.trends - Historical conflict data points
     * @returns {Promise<Object>} returns.thresholds - Current alert thresholds
     * @returns {Promise<string>} returns.status - Overall conflict status ('healthy', 'elevated', 'critical')
     * @returns {Promise<number>} returns.lastConflictTime - Timestamp of most recent conflict
     * 
     * @example
     * const conflictStatus = await healthMonitor.getConflictMetrics();
     * console.log(`Conflict rate: ${conflictStatus.conflictRate.toFixed(2)} per hour`);
     * console.log(`Status: ${conflictStatus.status}`);
     */
    async getConflictMetrics() {
        const assetConflictCount = Object.keys(this.conflictMetrics.conflictsByAsset).length;
        const fieldConflictCount = Object.keys(this.conflictMetrics.conflictsByField).length;
        
        // Determine conflict status
        let status = 'healthy';
        if (this.conflictMetrics.conflictRate > this.conflictMetrics.threshold.maxConflictsPerHour) {
            status = 'critical';
        } else if (this.conflictMetrics.conflictRate > this.conflictMetrics.threshold.maxConflictsPerHour * 0.5) {
            status = 'elevated';
        }

        return {
            totalConflicts: this.conflictMetrics.totalConflicts,
            conflictRate: Math.round(this.conflictMetrics.conflictRate * 100) / 100,
            conflictsByField: { ...this.conflictMetrics.conflictsByField },
            conflictsByAsset: { ...this.conflictMetrics.conflictsByAsset },
            assetConflictCount,
            fieldConflictCount,
            trends: this.conflictMetrics.conflictTrends.slice(-24), // Last 24 data points
            thresholds: { ...this.conflictMetrics.threshold },
            status,
            lastConflictTime: this.conflictMetrics.lastConflictTime,
            peakPeriods: this.conflictMetrics.peakConflictPeriods.slice(-5) // Last 5 peak periods
        };
    }

    /**
     * Calculates comprehensive health details for a specific data source.
     * Combines health data with circuit breaker state to determine overall source status.
     * 
     * @private
     * @param {string} sourceId - Unique identifier for the data source
     * @param {Object} data - Raw health data from this.healthData Map
     * @param {boolean} data.operational - Whether source is considered operational
     * @param {number} data.healthScore - Current health score (0-100)
     * @param {Object} data.responseTime - Response time tracking data
     * @param {Object} data.errorMetrics - Error tracking data
     * @param {Object} data.rateLimit - Rate limiting information
     * @param {Object} data.dataQuality - Data quality metrics
     * @returns {Object} Comprehensive source health object with calculated metrics including percentiles
     * 
     * @example
     * // Internal usage only
     * const sourceHealth = this._calculateSourceHealth('cmc', healthData.get('cmc'));
     */
    _calculateSourceHealth(sourceId, data) {
        const circuitBreaker = this.circuitBreakers.get(sourceId);
        const status = this._determineSourceStatus(data, circuitBreaker);
        
        return {
            sourceId,
            sourceName: sourceId.toUpperCase(), // Could be improved with actual names
            status,
            operational: data.operational && circuitBreaker.state !== 'open',
            healthScore: data.healthScore,
            responseTime: {
                current: data.responseTime.current,
                average: Math.round(data.responseTime.average),
                median: this._calculateMedian(data.responseTime.samples.map(s => s.duration)),
                p95: this._calculatePercentile(data.responseTime.samples.map(s => s.duration), 95),
                p99: this._calculatePercentile(data.responseTime.samples.map(s => s.duration), 99),
                min: Math.min(...data.responseTime.samples.map(s => s.duration)) || 0,
                max: Math.max(...data.responseTime.samples.map(s => s.duration)) || 0,
                trend: [] // Could be calculated from historical data
            },
            errorMetrics: {
                errorRate: data.errorMetrics.errorRate,
                errorCount: data.errorMetrics.errorCount,
                errorTypes: { ...data.errorMetrics.errorTypes },
                recentErrors: [...data.errorMetrics.recentErrors],
                trend: {} // Could be calculated
            },
            rateLimit: { ...data.rateLimit },
            dataQuality: { ...data.dataQuality },
            lastSuccessfulOperation: data.lastSuccessfulOperation,
            consecutiveFailures: data.consecutiveFailures,
            lastError: data.lastError,
            circuitBreaker: { ...circuitBreaker }
        };
    }

    /**
     * Updates circuit breaker state based on operation success or failure.
     * Implements circuit breaker pattern with closed, open, and half-open states.
     * 
     * @private
     * @param {string} sourceId - Unique identifier for the data source
     * @param {boolean} success - Whether the operation succeeded (true) or failed (false)
     * @returns {void}
     * 
     * Circuit Breaker States:
     * - closed: Normal operation, requests flow through
     * - open: Circuit tripped, requests blocked until timeout
     * - half-open: Testing state, limited requests allowed
     */
    _updateCircuitBreaker(sourceId, success) {
        const AppConfig = require('../config/AppConfig');
        const cbConfig = AppConfig.circuitBreaker;
        
        if (!cbConfig.enabled) return;
        
        const cb = this.circuitBreakers.get(sourceId);
        
        if (success) {
            if (cb.state === 'half-open') {
                cb.successCount++;
                if (cb.successCount >= 3) { // Could be configurable
                    cb.state = 'closed';
                    cb.failureCount = 0;
                    cb.successCount = 0;
                }
            } else if (cb.state === 'closed') {
                cb.failureCount = Math.max(0, cb.failureCount - 1);
            }
        } else {
            cb.failureCount++;
            cb.successCount = 0;
            
            if (cb.state === 'closed' && cb.failureCount >= cbConfig.failureThreshold) {
                cb.state = 'open';
                cb.nextRetryTime = Date.now() + cbConfig.timeout;
            } else if (cb.state === 'half-open') {
                cb.state = 'open';
                cb.nextRetryTime = Date.now() + cbConfig.timeout;
            }
        }
        
        // Check if circuit should move to half-open
        if (cb.state === 'open' && Date.now() >= cb.nextRetryTime) {
            cb.state = 'half-open';
            cb.nextRetryTime = null;
        }
    }

    /**
     * Calculates and updates the health score for a data source based on multiple factors.
     * Considers error rates, consecutive failures, response times, and circuit breaker state.
     * 
     * @private
     * @param {string} sourceId - Unique identifier for the data source
     * @returns {void}
     * 
     * Scoring factors:
     * - Base score: 100
     * - Error rate penalty: up to -50 points
     * - Consecutive failures: up to -40 points  
     * - Slow response times: -20 points
     * - Circuit breaker open: score = 0
     * - Circuit breaker half-open: score *= 0.5
     */
    _updateHealthScore(sourceId) {
        const data = this.healthData.get(sourceId);
        const cb = this.circuitBreakers.get(sourceId);
        
        let score = 100;
        
        // Penalize for errors
        if (data.errorMetrics.errorRate > 0) {
            score -= data.errorMetrics.errorRate * 50;
        }
        
        // Penalize for consecutive failures
        if (data.consecutiveFailures > 0) {
            score -= Math.min(data.consecutiveFailures * 10, 40);
        }
        
        // Penalize for slow response times
        if (data.responseTime.average > this.config.responseTimeThreshold) {
            score -= 20;
        }
        
        // Penalize for circuit breaker state
        if (cb.state === 'open') {
            score = 0;
        } else if (cb.state === 'half-open') {
            score *= 0.5;
        }
        
        data.healthScore = Math.max(0, Math.min(100, score));
        data.operational = score > 20; // Operational threshold
    }

    /**
     * Analyzes current source state to determine if new alerts should be generated.
     * Checks for high error rates, consecutive failures, and circuit breaker state changes.
     * 
     * @private
     * @param {string} sourceId - Unique identifier for the data source
     * @param {Object} error - Error information from the failed operation
     * @param {string} error.message - Error message
     * @param {string} error.errorType - Type/category of error
     * @returns {void}
     * 
     * Alert Types Generated:
     * - error_rate: When error rate exceeds threshold
     * - consecutive_failures: When consecutive failures >= 3
     * - circuit_breaker: When circuit breaker opens
     */
    _checkForAlerts(sourceId, error) {
        const data = this.healthData.get(sourceId);
        
        // High error rate alert
        if (data.errorMetrics.errorRate > this.config.errorRateThreshold) {
            this._createAlert({
                type: 'error_rate',
                level: 'warning',
                source: sourceId,
                title: 'High Error Rate',
                description: `Error rate for ${sourceId} is ${(data.errorMetrics.errorRate * 100).toFixed(1)}%`,
                metadata: { errorRate: data.errorMetrics.errorRate }
            });
        }
        
        // Consecutive failures alert
        if (data.consecutiveFailures >= 3) {
            this._createAlert({
                type: 'consecutive_failures',
                level: 'error',
                source: sourceId,
                title: 'Consecutive Failures',
                description: `${data.consecutiveFailures} consecutive failures for ${sourceId}`,
                metadata: { consecutiveFailures: data.consecutiveFailures }
            });
        }
        
        // Circuit breaker open alert
        const cb = this.circuitBreakers.get(sourceId);
        if (cb.state === 'open') {
            this._createAlert({
                type: 'circuit_breaker',
                level: 'critical',
                source: sourceId,
                title: 'Circuit Breaker Open',
                description: `Circuit breaker opened for ${sourceId} due to repeated failures`,
                metadata: { circuitBreakerState: cb.state }
            });
        }
    }

    /**
     * Creates and stores a new health alert in the active alerts registry.
     * Generates unique alert ID and adds recommended remediation actions.
     * 
     * @private
     * @param {Object} alertData - Configuration for the new alert
     * @param {string} alertData.type - Alert type identifier
     * @param {string} alertData.level - Severity level ('info', 'warning', 'error', 'critical')
     * @param {string} alertData.source - Source that triggered the alert
     * @param {string} alertData.title - Short alert title
     * @param {string} alertData.description - Detailed alert description
     * @param {Object} [alertData.metadata] - Additional context data
     * @returns {void}
     */
    _createAlert(alertData) {
        // De-duplicate: if there is an active alert for same source+type, keep the highest severity
        const levelPriority = { info: 0, warning: 1, error: 2, critical: 3 };
        let existingId = null;
        let existing = null;
        for (const [id, a] of this.activeAlerts) {
            if (a.active && a.source === alertData.source && a.type === alertData.type) {
                existingId = id; existing = a; break;
            }
        }

        if (existing) {
            const prevP = levelPriority[existing.level] ?? 0;
            const currP = levelPriority[alertData.level] ?? 0;
            if (currP > prevP) {
                // Upgrade existing alert severity and refresh details
                existing.level = alertData.level;
                existing.title = alertData.title;
                existing.description = alertData.description;
                existing.metadata = { ...(existing.metadata || {}), ...(alertData.metadata || {}) };
                existing.timestamp = Date.now();
                this.activeAlerts.set(existingId, existing);
            }
            return;
        }

        const alertId = `${alertData.source}_${alertData.type}_${Date.now()}`;

        const alert = {
            id: alertId,
            level: alertData.level,
            type: alertData.type,
            source: alertData.source,
            title: alertData.title,
            description: alertData.description,
            timestamp: Date.now(),
            active: true,
            metadata: alertData.metadata || {},
            actions: this._getRecommendedActions(alertData.type)
        };

        this.activeAlerts.set(alertId, alert);
    }

    /**
     * Returns a list of recommended remediation actions for a specific alert type.
     * Provides actionable guidance to help resolve the underlying issue.
     * 
     * @private
     * @param {string} alertType - The type of alert needing actions
     * @returns {Array<string>} Array of recommended action descriptions
     * 
     * Supported Alert Types:
     * - error_rate: Actions for high error rate issues
     * - consecutive_failures: Actions for repeated failures
     * - circuit_breaker: Actions for circuit breaker trips
     * - conflict_rate: Actions for high conflict rates
     * - conflict_threshold: Actions when conflict thresholds are exceeded
     */
    _getRecommendedActions(alertType) {
        const actions = {
            error_rate: [
                'Check API service status',
                'Verify network connectivity',
                'Review recent error messages'
            ],
            consecutive_failures: [
                'Check API credentials',
                'Verify API endpoints',
                'Check rate limiting status'
            ],
            circuit_breaker: [
                'Wait for circuit breaker timeout',
                'Check API service status',
                'Review error logs for root cause'
            ],
            conflict_rate: [
                'Review data source configurations',
                'Check for API schema changes',
                'Validate source priority settings',
                'Monitor data quality trends'
            ],
            conflict_threshold: [
                'Investigate specific conflicting assets',
                'Review field-level conflict patterns',
                'Check for systematic data quality issues',
                'Consider adjusting conflict resolution rules'
            ]
        };
        
        return actions[alertType] || ['Review service logs'];
    }

    /**
     * Checks for conflict-related alerts and generates them when thresholds are exceeded.
     * 
     * @private
     * @param {number} assetCount - Total number of assets being monitored
     * @returns {void}
     */
    _checkConflictAlerts(assetCount) {
        const { threshold } = this.conflictMetrics;
        
        // Check conflict rate threshold
        if (this.conflictMetrics.conflictRate > threshold.maxConflictsPerHour) {
            this._createAlert({
                type: 'conflict_rate',
                level: 'warning',
                source: 'system',
                title: 'High Conflict Rate',
                description: `Conflict rate is ${this.conflictMetrics.conflictRate.toFixed(1)} per hour (threshold: ${threshold.maxConflictsPerHour})`,
                metadata: { 
                    conflictRate: this.conflictMetrics.conflictRate,
                    threshold: threshold.maxConflictsPerHour
                }
            });
        }

        // Check percentage of assets with conflicts
        if (assetCount > 0) {
            const assetConflictCount = Object.keys(this.conflictMetrics.conflictsByAsset).length;
            const conflictPercentage = assetConflictCount / assetCount;
            
            if (conflictPercentage > threshold.alertThreshold) {
                this._createAlert({
                    type: 'conflict_threshold',
                    level: conflictPercentage > threshold.alertThreshold * 2 ? 'error' : 'warning',
                    source: 'system',
                    title: 'High Asset Conflict Percentage',
                    description: `${(conflictPercentage * 100).toFixed(1)}% of assets have conflicts (threshold: ${(threshold.alertThreshold * 100).toFixed(1)}%)`,
                    metadata: { 
                        conflictPercentage,
                        assetConflictCount,
                        totalAssets: assetCount,
                        threshold: threshold.alertThreshold
                    }
                });
            }
        }

        // Check for specific assets with high conflict counts
        Object.entries(this.conflictMetrics.conflictsByAsset).forEach(([assetKey, count]) => {
            if (count >= threshold.maxConflictsPerAsset) {
                this._createAlert({
                    type: 'asset_conflict',
                    level: count >= threshold.maxConflictsPerAsset * 2 ? 'error' : 'warning',
                    source: 'system',
                    title: `High Conflicts for ${assetKey}`,
                    description: `Asset ${assetKey} has ${count} conflicts (threshold: ${threshold.maxConflictsPerAsset})`,
                    metadata: { 
                        assetKey,
                        conflictCount: count,
                        threshold: threshold.maxConflictsPerAsset
                    }
                });
            }
        });

        // Track peak conflict periods
        const now = Date.now();
        if (this.conflictMetrics.conflictRate > threshold.maxConflictsPerHour * 1.5) {
            this.conflictMetrics.peakConflictPeriods.push({
                timestamp: now,
                conflictRate: this.conflictMetrics.conflictRate,
                duration: 'ongoing'
            });

            // Keep only last 10 peak periods
            this.conflictMetrics.peakConflictPeriods = this.conflictMetrics.peakConflictPeriods.slice(-10);
        }
    }

    /**
     * Updates system health scoring to include conflict impact.
     * Conflicts reduce overall system health score and operational status.
     * 
     * @private
     * @returns {void}
     */
    _updateSystemHealthScoreForConflicts() {
        // Apply conflict penalties to overall system health
        // This affects the health score reported in getSystemHealth()
        
        const conflictPenalty = Math.min(
            this.conflictMetrics.conflictRate * 0.5, // 0.5 points per conflict per hour
            20 // Maximum penalty of 20 points
        );

        // Store conflict penalty for use in getSystemHealth
        this.systemMetrics.conflictHealthPenalty = conflictPenalty;
        
        // Add conflict impact to degraded mode consideration
        const assetConflictCount = Object.keys(this.conflictMetrics.conflictsByAsset).length;
        this.systemMetrics.conflictStatus = {
            rate: this.conflictMetrics.conflictRate,
            assetCount: assetConflictCount,
            penalty: conflictPenalty,
            timestamp: Date.now()
        };
    }

    // Helper methods for calculations
    /**
     * Calculates the median value from an array of numbers.
     * Returns the middle value for odd-length arrays, or average of two middle values for even-length arrays.
     * 
     * @private
     * @param {Array<number>} values - Array of numeric values
     * @returns {number} The median value, or 0 if array is empty
     * 
     * @example
     * this._calculateMedian([1, 3, 2, 5, 4]); // returns 3
     * this._calculateMedian([1, 2, 3, 4]);   // returns 2.5
     */
    _calculateMedian(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Calculates a specific percentile from an array of numbers.
     * Uses the nearest-rank method for percentile calculation.
     * 
     * @private
     * @param {Array<number>} values - Array of numeric values
     * @param {number} percentile - Percentile to calculate (0-100)
     * @returns {number} The value at the specified percentile, or 0 if array is empty
     * 
     * @example
     * this._calculatePercentile([1, 2, 3, 4, 5], 95); // returns value at 95th percentile
     * this._calculatePercentile([100, 200, 300], 50);  // returns median value
     */
    _calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        return sorted[Math.ceil(index)] || 0;
    }

    /**
     * Calculates the overall system success rate as a ratio between 0 and 1.
     * 
     * @private
     * @returns {number} Success rate (0.0 to 1.0), defaults to 1.0 if no requests recorded
     */
    _calculateSystemSuccessRate() {
        if (this.systemMetrics.totalRequests === 0) return 1;
        return 1 - (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests);
    }

    /**
     * Calculates the overall system error rate as a ratio between 0 and 1.
     * 
     * @private
     * @returns {number} Error rate (0.0 to 1.0), defaults to 0.0 if no requests recorded
     */
    _calculateSystemErrorRate() {
        if (this.systemMetrics.totalRequests === 0) return 0;
        return this.systemMetrics.totalErrors / this.systemMetrics.totalRequests;
    }

    /**
     * Calculates the average response time across all system requests.
     * 
     * @private
     * @returns {number} Average response time in milliseconds, or 0 if no requests recorded
     */
    _calculateSystemAverageResponseTime() {
        if (this.systemMetrics.totalRequests === 0) return 0;
        return this.systemMetrics.responseTimeSum / this.systemMetrics.totalRequests;
    }

    /**
     * Calculates overall system data freshness by averaging freshness scores across all sources.
     * Simple implementation that could be enhanced with time-based weighting.
     * 
     * @private
     * @returns {number} Average freshness score (0.0 to 1.0), or 0 if no sources
     */
    _calculateSystemDataFreshness() {
        // Simple implementation - could be more sophisticated
        let totalFreshness = 0;
        let sourceCount = 0;
        
        for (const data of this.healthData.values()) {
            totalFreshness += data.dataQuality.freshnessScore;
            sourceCount++;
        }
        
        return sourceCount > 0 ? totalFreshness / sourceCount : 0;
    }

    /**
     * Determines overall system status based on health metrics and source availability.
     * 
     * @private
     * @param {number} overallScore - Aggregated health score (0-100)
     * @param {number} healthySources - Number of currently healthy sources
     * @param {number} totalSources - Total number of monitored sources
     * @returns {string} System status: 'healthy', 'degraded', 'critical', or 'down'
     * 
     * Status Logic:
     * - 'down': No healthy sources available
     * - 'critical': Overall score < 30
     * - 'degraded': Overall score < 60 OR less than 50% sources healthy
     * - 'healthy': All other cases
     */
    _determineSystemStatus(overallScore, healthySources, totalSources) {
        if (healthySources === 0) return 'down';
        if (overallScore < 30) return 'critical';
        if (overallScore < 60 || healthySources < totalSources * 0.5) return 'degraded';
        return 'healthy';
    }

    /**
     * Determines individual source status based on operational state and health score.
     * 
     * @private
     * @param {Object} data - Source health data
     * @param {boolean} data.operational - Whether source is operational
     * @param {number} data.healthScore - Current health score (0-100)
     * @param {Object} circuitBreaker - Circuit breaker state
     * @param {string} circuitBreaker.state - Current circuit breaker state
     * @returns {string} Source status: 'healthy', 'degraded', 'critical', or 'down'
     * 
     * Status Logic:
     * - 'down': Circuit breaker is open
     * - 'critical': Source not operational
     * - 'degraded': Health score < 60
     * - 'healthy': All other cases
     */
    _determineSourceStatus(data, circuitBreaker) {
        if (circuitBreaker.state === 'open') return 'down';
        if (!data.operational) return 'critical';
        if (data.healthScore < 60) return 'degraded';
        return 'healthy';
    }

    /**
     * Formats system uptime as a human-readable string.
     * 
     * @private
     * @returns {string} Uptime formatted as "XhYm" (e.g., "2h 30m")
     */
    _getUptime() {
        const uptimeMs = Date.now() - this.systemMetrics.startTime;
        const hours = Math.floor(uptimeMs / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    /**
     * Performs periodic system-wide health check operations.
     * Currently updates the last check timestamp; can be extended with additional checks.
     * 
     * @private
     * @returns {void}
     */
    _performSystemHealthCheck() {
        this.systemMetrics.lastSystemCheck = Date.now();
        // Additional system-wide health checks could be performed here
    }

    /**
     * Removes old data that exceeds the configured retention period.
     * Cleans up expired alerts, response time samples, and error records.
     * 
     * @private
     * @returns {void}
     */
    _cleanupOldData() {
        const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionMs;
        
        // Cleanup old alerts
        for (const [alertId, alert] of this.activeAlerts) {
            if (alert.timestamp < cutoff) {
                this.activeAlerts.delete(alertId);
            }
        }
        
        // Cleanup old performance data
        for (const data of this.healthData.values()) {
            data.responseTime.samples = data.responseTime.samples.filter(s => s.timestamp > cutoff);
            data.errorMetrics.recentErrors = data.errorMetrics.recentErrors.filter(e => e.timestamp > cutoff);
        }
    }

    /**
     * Checks if any active alerts for a source can be resolved based on improved health metrics.
     * Deactivates alerts when conditions improve beyond resolution thresholds.
     * 
     * @private
     * @param {string} sourceId - Unique identifier for the data source
     * @returns {void}
     * 
     * Resolution Criteria:
     * - Health score > 80
     * - No consecutive failures
     */
    _checkAlertResolution(sourceId) {
        // Check if any alerts can be resolved
        for (const [alertId, alert] of this.activeAlerts) {
            if (alert.source === sourceId && alert.active) {
                // Logic to check if alert conditions are resolved
                // This is simplified - real implementation would check specific conditions
                const data = this.healthData.get(sourceId);
                if (data.healthScore > 80 && data.consecutiveFailures === 0) {
                    alert.active = false;
                }
            }
        }
    }
}

/**
 * Simple circular buffer implementation for storing performance data with automatic overflow handling.
 * Maintains a fixed-size buffer that overwrites oldest entries when capacity is reached.
 * 
 * @class CircularBuffer
 * 
 * @example
 * const buffer = new CircularBuffer(100);
 * buffer.add({ timestamp: Date.now(), duration: 250 });
 * const recentData = buffer.getRecent(10);
 */
class CircularBuffer {
    /**
     * Creates a new circular buffer with specified capacity.
     * 
     * @constructor
     * @param {number} size - Maximum number of items the buffer can hold
     * @throws {TypeError} If size is not a positive number
     */
    constructor(size) {
        this.size = size;
        this.buffer = [];
        this.index = 0;
    }
    
    /**
     * Adds an item to the buffer, overwriting the oldest item if at capacity.
     * 
     * @param {*} item - Item to add to the buffer (any type)
     * @returns {void}
     * 
     * @example
     * buffer.add({ timestamp: Date.now(), success: true, duration: 150 });
     */
    add(item) {
        this.buffer[this.index] = item;
        this.index = (this.index + 1) % this.size;
    }
    
    /**
     * Returns a copy of all items currently stored in the buffer.
     * Items may not be in chronological order due to circular nature.
     * 
     * @returns {Array<*>} Array containing all buffer items
     */
    getAll() {
        return [...this.buffer];
    }
    
    /**
     * Returns the most recently added items from the buffer.
     * 
     * @param {number} count - Number of recent items to retrieve
     * @returns {Array<*>} Array containing the most recent items, up to the requested count
     * 
     * @example
     * const last10Operations = buffer.getRecent(10);
     */
    getRecent(count) {
        return this.buffer.slice(-count);
    }
}

module.exports = HealthMonitor;
