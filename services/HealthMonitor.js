const IHealthMonitor = require('../interfaces/IHealthMonitor');
const AppConfig = require('../config/AppConfig');

/**
 * Health monitoring implementation for multi-API architecture
 * Tracks performance, errors, and health status for all data sources
 */
class HealthMonitor extends IHealthMonitor {
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
     * Start periodic health monitoring
     * @private
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
     * Initialize health tracking for a data source
     * @param {string} sourceId - Data source identifier
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
     * Get overall system health status
     * @returns {Promise<SystemHealth>} Complete system health overview
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
        
        const overallScore = sourceCount > 0 ? totalScore / sourceCount : 0;
        const degradedMode = await this.checkDegradedMode();
        
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
            activeAlerts,
            degradedMode,
            timestamp: Date.now(),
            uptime: this._getUptime()
        };
    }

    /**
     * Get health status for a specific data source
     * @param {string} sourceId - Data source identifier
     * @returns {Promise<DataSourceHealth>} Health status for specific source
     */
    async getSourceHealth(sourceId) {
        const data = this.healthData.get(sourceId);
        if (!data) {
            throw new Error(`Unknown data source: ${sourceId}`);
        }
        
        return this._calculateSourceHealth(sourceId, data);
    }

    /**
     * Record successful operation for monitoring
     * @param {string} sourceId - Data source identifier
     * @param {OperationMetrics} metrics - Operation performance data
     * @returns {Promise<void>}
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
     * Record failed operation for monitoring
     * @param {string} sourceId - Data source identifier
     * @param {OperationError} error - Error information
     * @returns {Promise<void>}
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
     * Check if system should enter degraded mode
     * @returns {Promise<DegradedModeStatus>} Degraded mode recommendation
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
     * Get health alerts
     * @param {AlertLevel} level - Minimum alert level to return
     * @returns {Promise<Array<HealthAlert>>} Active health alerts
     */
    async getHealthAlerts(level = 'info') {
        const levelPriority = { info: 0, warning: 1, error: 2, critical: 3 };
        const minPriority = levelPriority[level] || 0;
        
        return Array.from(this.activeAlerts.values())
            .filter(alert => levelPriority[alert.level] >= minPriority)
            .sort((a, b) => levelPriority[b.level] - levelPriority[a.level]);
    }

    /**
     * Calculate source health details
     * @private
     * @param {string} sourceId - Source identifier
     * @param {Object} data - Health data
     * @returns {DataSourceHealth} Detailed health status
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
     * Update circuit breaker state
     * @private
     * @param {string} sourceId - Source identifier
     * @param {boolean} success - Whether operation succeeded
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
     * Update health score for a source
     * @private
     * @param {string} sourceId - Source identifier
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
     * Check for new alerts
     * @private
     * @param {string} sourceId - Source identifier
     * @param {OperationError} error - Error that occurred
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
     * Create a new alert
     * @private
     * @param {Object} alertData - Alert data
     */
    _createAlert(alertData) {
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
     * Get recommended actions for alert type
     * @private
     * @param {string} alertType - Type of alert
     * @returns {Array<string>} Recommended actions
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
            ]
        };
        
        return actions[alertType] || ['Review service logs'];
    }

    // Helper methods for calculations
    _calculateMedian(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    _calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        return sorted[Math.ceil(index)] || 0;
    }

    _calculateSystemSuccessRate() {
        if (this.systemMetrics.totalRequests === 0) return 1;
        return 1 - (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests);
    }

    _calculateSystemErrorRate() {
        if (this.systemMetrics.totalRequests === 0) return 0;
        return this.systemMetrics.totalErrors / this.systemMetrics.totalRequests;
    }

    _calculateSystemAverageResponseTime() {
        if (this.systemMetrics.totalRequests === 0) return 0;
        return this.systemMetrics.responseTimeSum / this.systemMetrics.totalRequests;
    }

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

    _determineSystemStatus(overallScore, healthySources, totalSources) {
        if (healthySources === 0) return 'down';
        if (overallScore < 30) return 'critical';
        if (overallScore < 60 || healthySources < totalSources * 0.5) return 'degraded';
        return 'healthy';
    }

    _determineSourceStatus(data, circuitBreaker) {
        if (circuitBreaker.state === 'open') return 'down';
        if (!data.operational) return 'critical';
        if (data.healthScore < 60) return 'degraded';
        return 'healthy';
    }

    _getUptime() {
        const uptimeMs = Date.now() - this.systemMetrics.startTime;
        const hours = Math.floor(uptimeMs / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    _performSystemHealthCheck() {
        this.systemMetrics.lastSystemCheck = Date.now();
        // Additional system-wide health checks could be performed here
    }

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
 * Simple circular buffer for performance data
 */
class CircularBuffer {
    constructor(size) {
        this.size = size;
        this.buffer = [];
        this.index = 0;
    }
    
    add(item) {
        this.buffer[this.index] = item;
        this.index = (this.index + 1) % this.size;
    }
    
    getAll() {
        return [...this.buffer];
    }
    
    getRecent(count) {
        return this.buffer.slice(-count);
    }
}

module.exports = HealthMonitor;