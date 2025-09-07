# StablecoinWatch v2 - Integration & Cleanup TODO

This document outlines tasks to resolve the architectural debt identified in the structural completeness review. The codebase currently has ~2,300 lines of unused, well-designed code that needs integration or removal.

## Current Status

âœ… **Working**: Platform display fixes, hybrid CMC+Messari data aggregation, basic environment configuration  
âŒ **Not Integrated**: Service-oriented architecture, health monitoring, advanced configuration, interface system

## Critical Issues to Address

### **Priority 1: Critical Integration Issues**

#### Task 1.1: Service Architecture Integration

**Description**: Integrate the service-oriented architecture with the main application

- [x] Create service container/registry in `app/app.js`
- [x] Implement dependency injection pattern
- [x] Replace `global.dataService` with proper service registration
- [x] Add service lifecycle management (startup/shutdown)
- [x] Create service initialization sequence

**Files Affected**: `app/app.js`, `routes/routes.js`

#### Task 1.2: Configuration System Integration  

**Description**: Replace direct `process.env` usage with centralized configuration

- [ ] Migrate `app/app.js` to use `AppConfig` instead of `process.env`
- [ ] Update `hybrid-stablecoin-service.js` to use `ApiConfig`
- [ ] Add configuration validation during startup
- [ ] Implement environment-specific configuration loading
- [ ] Add configuration error handling and warnings

**Files Affected**: `app/app.js`, `app/hybrid-stablecoin-service.js`

#### Task 1.3: Health Monitoring Integration

**Description**: Activate the health monitoring system

- [x] Initialize `HealthMonitor` service in `app/app.js`
- [x] Integrate health tracking with API calls in `hybrid-stablecoin-service.js`
- [x] Add health monitoring middleware to Express routes
- [x] Create `/status` endpoint (HTML dashboard)
- [x] Create `/api/health` endpoint
- [x] Implement circuit breaker logic for API calls
- [x] Add health status logging and alerts

**Files Affected**: `app/app.js`, `app/hybrid-stablecoin-service.js`, `routes/routes.js`

### **Priority 2: Documentation Accuracy Issues**

#### Task 2.1: Architecture Documentation Correction

**Description**: Align documentation with actual implementation status

- [ ] Update README.md to reflect current integration status
- [ ] Correct CLAUDE.md architecture claims
- [ ] Add migration roadmap to documentation  
- [ ] Create "Current vs Planned" architecture section
- [ ] Update status indicators for features (âœ… implemented, ðŸ”„ in progress, â³ planned)

**Files Affected**: `README.md`, `CLAUDE.md`

#### Task 2.2: Configuration Documentation Alignment

**Description**: Ensure configuration docs match actual usage

- [x] Audit `CONFIGURATION_GUIDE.md` against actual implementation
- [x] Mark which config options are active vs planned
- [x] Update examples to reflect current integration
- [x] Add migration notes for configuration changes

**Files Affected**: `docs/CONFIGURATION_GUIDE.md`

#### Task 2.3: API Integration Guide Updates

**Description**: Update integration guide to reflect current architecture

- [ ] Mark API Integration Guide as "future implementation"
- [ ] Add prerequisites section (service integration must be completed first)
- [ ] Create "Quick Add" vs "Full Integration" paths
- [ ] Update examples to match current service patterns

**Files Affected**: `docs/API_INTEGRATION_GUIDE.md`

### **Priority 3: Implementation Tasks**

#### Task 3.1: Data Fetcher Interface Implementation

**Description**: Create concrete implementations of data fetcher interfaces

- [ ] Implement `CmcDataFetcher` class extending `IDataFetcher`
- [ ] Implement `MessariDataFetcher` class extending `IDataFetcher`  
- [ ] Create `CoinGeckoDataFetcher` stub (configuration ready)
- [ ] Create `DeFiLlamaDataFetcher` stub (configuration ready)
- [ ] Add data fetcher registration system
- [ ] Migrate existing API logic to new fetcher classes

**Files Affected**: New files in `services/`, update `app/hybrid-stablecoin-service.js`

#### Task 3.2: Service Layer Implementation

**Description**: Implement the main data service using interfaces

- [ ] Create `StablecoinDataService` implementing `IStablecoinDataService`
- [ ] Add data merging and priority logic using interface system
- [ ] Implement confidence scoring and consensus tracking
- [ ] Add fallback and degraded mode handling
- [ ] Create service factory pattern for easy testing

**Files Affected**: New files in `services/`, update `app/app.js`

#### Task 3.3: Testing Infrastructure

**Description**: Add testing for new architecture components

- [ ] Set up test framework (Jest or Mocha)
- [ ] Create unit tests for configuration classes
- [ ] Add integration tests for service layer
- [ ] Create mock implementations for testing
- [ ] Add health monitoring tests
- [ ] Update `package.json` with test scripts

**Files Affected**: New `test/` directory, `package.json`

### **Priority 4: Technical Debt Cleanup**

#### Task 4.1: Code Organization

**Description**: Clean up file organization and remove truly unused code

- [ ] Audit all files for actual usage
- [ ] Remove or integrate orphaned code
- [ ] Standardize import/export patterns
- [ ] Add JSDoc comments to public interfaces
- [ ] Clean up console.log statements

**Files Affected**: Various

#### Task 4.2: Error Handling Standardization  

**Description**: Implement consistent error handling across services

- [ ] Create standard error classes
- [ ] Add error tracking to health monitoring
- [ ] Implement proper error boundaries
- [ ] Add retry logic using configuration
- [ ] Standardize error logging format

**Files Affected**: Various service files

#### Task 4.3: Performance Optimization

**Description**: Optimize the integrated architecture

- [ ] Add caching layer integration
- [ ] Implement connection pooling
- [ ] Add request batching where possible
- [ ] Profile memory usage and optimize
- [ ] Add performance metrics to health monitoring

**Files Affected**: Service layer files

## Alternative Cleanup Approach

If full integration is deemed too complex, here's a **simplified cleanup approach**:

### **Cleanup Option: Remove Unused Architecture**

#### Task C.1: Remove Dead Code


- [ ] Delete `interfaces/` directory
- [ ] Delete `config/` directory  
- [ ] Delete `services/` directory
- [ ] Delete `docs/API_INTEGRATION_GUIDE.md`
- [ ] Simplify `docs/CONFIGURATION_GUIDE.md` to only actual env vars

#### Task C.2: Update Documentation to Reality


- [ ] Rewrite README.md to describe actual monolithic architecture
- [ ] Update CLAUDE.md to reflect simple dual-API approach
- [ ] Remove service-oriented architecture claims
- [ ] Focus documentation on existing platform normalization and data merging

#### Task C.3: Enhance Existing System


- [ ] Add better error handling to `hybrid-stablecoin-service.js`
- [ ] Implement basic health checks without full monitoring system
- [ ] Add configuration validation for critical env vars
- [ ] Improve logging and debugging capabilities



