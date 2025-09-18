/**
 * StablecoinWatch Advanced Filter System
 * 
 * A comprehensive client-side filtering system for stablecoin data
 * Features: real-time filtering, multiple filter types, state management,
 * localStorage persistence, and dynamic UI updates.
 */

class FilterManager {
    constructor() {
        // Initialize filter state
        this.state = {
            assetTypes: {
                fiat: true,
                commodities: true,
                crypto: true,
                tokenized: true,
                other: true
            },
            priceRange: {
                min: 0.50,
                max: 2.00,
                enabled: false
            },
            mcapRange: {
                min: 1,
                max: 100000,
                enabled: false,
                logScale: true
            },
            volumeRange: {
                min: 100,
                max: 10000000,
                enabled: false,
                logScale: true
            },
            platforms: {
                selected: [],
                crossChainOnly: false,
                minBlockchainCount: 1
            },
            dataQuality: {
                hideConflicts: false,
                completeDataOnly: false
            },
            search: {
                query: ''
            }
        };
        
        // Internal state
        this.filteredData = [];
        this.originalData = [];
        this.debounceTimeout = null;
        this.isInitialized = false;
        
        // Asset type classification
        this.assetClassification = {
            fiat: ['usd', 'eur', 'gbp', 'jpy', 'cny', 'cad', 'aud', 'chf', 'sek', 'nok', 'dkk'],
            commodities: ['gold', 'xau', 'silver', 'xag', 'oil', 'platinum'],
            crypto: ['btc', 'eth', 'bitcoin', 'ethereum'],
            tokenized: ['etf', 'stocks', 'realestate', 'treasurybills', 'commodities', 'tokenizedasset', 'rwa']
        };
        
        this.init();
    }
    
    /**
     * Initialize the filter system
     */
    init() {
        if (this.isInitialized) return;
        
        // Wait for DOM and data to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupFilterSystem());
        } else {
            this.setupFilterSystem();
        }
    }
    
    /**
     * Setup the complete filter system
     */
    setupFilterSystem() {
        // Load stablecoin data
        if (!window.StablecoinData || !window.StablecoinData.stablecoins) {
            console.warn('StablecoinData not available, filter system disabled');
            return;
        }
        
        this.originalData = [...window.StablecoinData.stablecoins];
        this.filteredData = [...this.originalData];
        
        // Setup UI event listeners
        this.setupEventListeners();
        
        // Setup platform multiselect options
        this.setupPlatformOptions();
        
        // Load saved filter preferences
        this.loadFilterPreferences();
        
        // Initialize filter UI state
        this.updateFilterUI();
        
        // Apply initial filters
        this.applyFilters();
        
        this.isInitialized = true;
        console.log('Filter system initialized with', this.originalData.length, 'stablecoins');
    }
    
    /**
     * Setup all event listeners for filter controls
     */
    setupEventListeners() {
        // Filter toggle button
        const filterToggleBtn = document.getElementById('filterToggleBtn');
        const filterPanel = document.getElementById('filterPanel');
        const activeFilters = document.getElementById('activeFilters');
        
        if (filterToggleBtn && filterPanel) {
            filterToggleBtn.addEventListener('click', () => {
                const isVisible = filterPanel.style.display === 'block';
                filterPanel.style.display = isVisible ? 'none' : 'block';
                filterToggleBtn.textContent = isVisible ? '🎛️ Show Filters' : '🎛️ Hide Filters';
                filterToggleBtn.setAttribute('aria-expanded', (!isVisible).toString());
                
                // Show/hide active filters display when panel is visible
                if (activeFilters) {
                    activeFilters.style.display = isVisible ? 'none' : 'block';
                }
            });
        }
        
        // Clear all filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }
        
        // Asset type checkboxes
        ['fiat', 'commodities', 'crypto', 'tokenized', 'other'].forEach(type => {
            const checkbox = document.getElementById(`filter_${type}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.state.assetTypes[type] = checkbox.checked;
                    this.debouncedApplyFilters();
                });
            }
        });
        
        // Price range inputs
        const priceMin = document.getElementById('priceMin');
        const priceMax = document.getElementById('priceMax');
        const priceRangeMin = document.getElementById('priceRangeMin');
        const priceRangeMax = document.getElementById('priceRangeMax');
        
        [priceMin, priceMax].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this.state.priceRange.min = parseFloat(priceMin.value) || 0.50;
                    this.state.priceRange.max = parseFloat(priceMax.value) || 2.00;
                    this.state.priceRange.enabled = this.state.priceRange.min > 0.50 || this.state.priceRange.max < 2.00;
                    this.debouncedApplyFilters();
                });
            }
        });
        
        [priceRangeMin, priceRangeMax].forEach(slider => {
            if (slider) {
                slider.addEventListener('input', () => {
                    this.state.priceRange.min = parseFloat(priceRangeMin.value) || 0.50;
                    this.state.priceRange.max = parseFloat(priceRangeMax.value) || 2.00;
                    this.state.priceRange.enabled = this.state.priceRange.min > 0.50 || this.state.priceRange.max < 2.00;
                    if (priceMin) priceMin.value = this.state.priceRange.min;
                    if (priceMax) priceMax.value = this.state.priceRange.max;
                    this.debouncedApplyFilters();
                });
            }
        });
        
        // Market cap range inputs
        const mcapMin = document.getElementById('mcapMin');
        const mcapMax = document.getElementById('mcapMax');
        const mcapLogScale = document.getElementById('mcapLogScale');
        
        [mcapMin, mcapMax].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this.state.mcapRange.min = parseFloat(mcapMin.value) || 1;
                    this.state.mcapRange.max = parseFloat(mcapMax.value) || 100000;
                    this.state.mcapRange.enabled = this.state.mcapRange.min > 1 || this.state.mcapRange.max < 100000;
                    this.debouncedApplyFilters();
                });
            }
        });
        
        if (mcapLogScale) {
            mcapLogScale.addEventListener('change', () => {
                this.state.mcapRange.logScale = mcapLogScale.checked;
                this.debouncedApplyFilters();
            });
        }
        
        // Volume range inputs
        const volumeMin = document.getElementById('volumeMin');
        const volumeMax = document.getElementById('volumeMax');
        const volumeLogScale = document.getElementById('volumeLogScale');
        
        [volumeMin, volumeMax].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this.state.volumeRange.min = parseFloat(volumeMin.value) || 100;
                    this.state.volumeRange.max = parseFloat(volumeMax.value) || 10000000;
                    this.state.volumeRange.enabled = this.state.volumeRange.min > 100 || this.state.volumeRange.max < 10000000;
                    this.debouncedApplyFilters();
                });
            }
        });
        
        if (volumeLogScale) {
            volumeLogScale.addEventListener('change', () => {
                this.state.volumeRange.logScale = volumeLogScale.checked;
                this.debouncedApplyFilters();
            });
        }
        
        // Platform filters
        const platformSelect = document.getElementById('platformSelect');
        if (platformSelect) {
            platformSelect.addEventListener('change', () => {
                this.state.platforms.selected = Array.from(platformSelect.selectedOptions).map(opt => opt.value).filter(Boolean);
                this.debouncedApplyFilters();
            });
        }
        
        const crossChainOnly = document.getElementById('filter_crosschain');
        if (crossChainOnly) {
            crossChainOnly.addEventListener('change', () => {
                this.state.platforms.crossChainOnly = crossChainOnly.checked;
                this.debouncedApplyFilters();
            });
        }
        
        const blockchainCount = document.getElementById('blockchainCount');
        if (blockchainCount) {
            blockchainCount.addEventListener('input', () => {
                this.state.platforms.minBlockchainCount = parseInt(blockchainCount.value) || 1;
                this.debouncedApplyFilters();
            });
        }
        
        // Data quality filters
        const hideConflicts = document.getElementById('filter_hideConflicts');
        if (hideConflicts) {
            hideConflicts.addEventListener('change', () => {
                this.state.dataQuality.hideConflicts = hideConflicts.checked;
                this.debouncedApplyFilters();
            });
        }
        
        const completeDataOnly = document.getElementById('filter_completeDataOnly');
        if (completeDataOnly) {
            completeDataOnly.addEventListener('change', () => {
                this.state.dataQuality.completeDataOnly = completeDataOnly.checked;
                this.debouncedApplyFilters();
            });
        }
        
        // Search filter
        const searchFilter = document.getElementById('searchFilter');
        if (searchFilter) {
            searchFilter.addEventListener('input', () => {
                this.state.search.query = searchFilter.value.trim();
                this.debouncedApplyFilters();
            });
        }
    }
    
    /**
     * Setup platform multiselect options
     */
    setupPlatformOptions() {
        const platformSelect = document.getElementById('platformSelect');
        if (!platformSelect || !window.StablecoinData.filterOptions) return;
        
        // Clear existing options except the first one
        while (platformSelect.children.length > 1) {
            platformSelect.removeChild(platformSelect.lastChild);
        }
        
        // Add platform options
        window.StablecoinData.filterOptions.allPlatforms.sort().forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = platform;
            platformSelect.appendChild(option);
        });
    }
    
    /**
     * Debounced apply filters to prevent excessive filtering during rapid input
     */
    debouncedApplyFilters() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.applyFilters();
            this.saveFilterPreferences();
        }, 150);
    }
    
    /**
     * Apply all active filters to the data
     */
    applyFilters() {
        let filtered = [...this.originalData];
        
        // Apply asset type filter
        filtered = this.filterByAssetType(filtered);
        
        // Apply price range filter
        if (this.state.priceRange.enabled) {
            filtered = this.filterByPriceRange(filtered);
        }
        
        // Apply market cap range filter
        if (this.state.mcapRange.enabled) {
            filtered = this.filterByMarketCapRange(filtered);
        }
        
        // Apply volume range filter
        if (this.state.volumeRange.enabled) {
            filtered = this.filterByVolumeRange(filtered);
        }
        
        // Apply platform filters
        filtered = this.filterByPlatforms(filtered);
        
        // Apply data quality filters
        filtered = this.filterByDataQuality(filtered);
        
        // Apply search filter
        if (this.state.search.query) {
            filtered = this.filterBySearch(filtered);
        }
        
        this.filteredData = filtered;
        this.updateDisplay();
        this.updateActiveFiltersDisplay();
    }
    
    /**
     * Filter by asset type (fiat, commodities, crypto, tokenized, other)
     */
    filterByAssetType(data) {
        return data.filter(coin => {
            const peggedAsset = (coin.pegged_asset || '').toLowerCase();
            
            if (this.state.assetTypes.fiat && this.assetClassification.fiat.includes(peggedAsset)) return true;
            if (this.state.assetTypes.commodities && this.assetClassification.commodities.includes(peggedAsset)) return true;
            if (this.state.assetTypes.crypto && this.assetClassification.crypto.includes(peggedAsset)) return true;
            if (this.state.assetTypes.tokenized && this.assetClassification.tokenized.includes(peggedAsset)) return true;
            if (this.state.assetTypes.other && !this.getAssetType(peggedAsset)) return true;
            
            return false;
        });
    }
    
    /**
     * Filter by price range
     */
    filterByPriceRange(data) {
        return data.filter(coin => {
            const price = coin.price || 0;
            return price >= this.state.priceRange.min && price <= this.state.priceRange.max;
        });
    }
    
    /**
     * Filter by market cap range
     */
    filterByMarketCapRange(data) {
        return data.filter(coin => {
            const mcap = (coin.circulating_mcap || 0) / 1000000; // Convert to millions
            if (this.state.mcapRange.logScale) {
                const logMcap = mcap > 0 ? Math.log10(mcap) : 0;
                const logMin = Math.log10(Math.max(this.state.mcapRange.min, 0.001));
                const logMax = Math.log10(this.state.mcapRange.max);
                return logMcap >= logMin && logMcap <= logMax;
            } else {
                return mcap >= this.state.mcapRange.min && mcap <= this.state.mcapRange.max;
            }
        });
    }
    
    /**
     * Filter by volume range
     */
    filterByVolumeRange(data) {
        return data.filter(coin => {
            const volume = (coin.volume_24h || 0) / 1000; // Convert to thousands
            if (this.state.volumeRange.logScale) {
                const logVolume = volume > 0 ? Math.log10(volume) : 0;
                const logMin = Math.log10(Math.max(this.state.volumeRange.min, 0.001));
                const logMax = Math.log10(this.state.volumeRange.max);
                return logVolume >= logMin && logVolume <= logMax;
            } else {
                return volume >= this.state.volumeRange.min && volume <= this.state.volumeRange.max;
            }
        });
    }
    
    /**
     * Filter by platform/blockchain criteria
     */
    filterByPlatforms(data) {
        return data.filter(coin => {
            const platforms = coin.platforms || [];
            const platformCount = platforms.length;
            
            // Check minimum blockchain count
            if (platformCount < this.state.platforms.minBlockchainCount) return false;
            
            // Check cross-chain only filter
            if (this.state.platforms.crossChainOnly && platformCount < 2) return false;
            
            // Check specific platform selection
            if (this.state.platforms.selected.length > 0) {
                const coinPlatformNames = platforms.map(p => p.name);
                const hasSelectedPlatform = this.state.platforms.selected.some(selected => 
                    coinPlatformNames.includes(selected)
                );
                if (!hasSelectedPlatform) return false;
            }
            
            return true;
        });
    }
    
    /**
     * Filter by data quality criteria
     */
    filterByDataQuality(data) {
        return data.filter(coin => {
            // Hide coins with conflicts
            if (this.state.dataQuality.hideConflicts && coin.conflicts) return false;
            
            // Show only coins with complete data
            if (this.state.dataQuality.completeDataOnly) {
                const hasPrice = coin.price && coin.price > 0;
                const hasMcap = coin.circulating_mcap && coin.circulating_mcap > 0;
                const hasVolume = coin.volume_24h && coin.volume_24h > 0;
                const hasPlatforms = coin.platforms && coin.platforms.length > 0;
                
                if (!hasPrice || !hasMcap || !hasVolume || !hasPlatforms) return false;
            }
            
            return true;
        });
    }
    
    /**
     * Filter by search query (name or symbol)
     */
    filterBySearch(data) {
        const query = this.state.search.query.toLowerCase();
        return data.filter(coin => {
            const name = (coin.name || '').toLowerCase();
            const symbol = (coin.symbol || '').toLowerCase();
            return name.includes(query) || symbol.includes(query);
        });
    }
    
    /**
     * Get asset type for a pegged asset
     */
    getAssetType(peggedAsset) {
        for (const [type, assets] of Object.entries(this.assetClassification)) {
            if (assets.includes(peggedAsset)) return type;
        }
        return null;
    }
    
    /**
     * Update the display with filtered data
     */
    updateDisplay() {
        this.updateTable();
        this.updateCharts();
        this.updateResultsCount();
    }
    
    /**
     * Update the coins table with filtered data
     */
    updateTable() {
        const tableBody = document.querySelector('#coinsTable tbody');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add filtered rows
        this.filteredData.forEach((coin, index) => {
            const row = this.createTableRow(coin, index + 1);
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Create a table row element for a coin
     */
    createTableRow(coin, rank) {
        const row = document.createElement('tr');
        
        // Get pegged asset CSS class for styling
        const pegKey = String(coin.pegged_asset || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        const known = ['usd','eur','gbp','jpy','cny','btc','gold','xau','silver','xag','etf','stocks','realestate','treasurybills','commodities','tokenizedasset'];
        const pegClass = known.includes(pegKey) ? pegKey : 'other';
        
        row.innerHTML = `
            <td class="rank"><span class="coin-rank">${rank}</span></td>
            <td>
                <div class="name-cell">
                    <img src="${coin.img_url}" alt="${coin.symbol}" />
                    <a href="/coins/${coin.uri}" class="coin-name">${coin.name}</a>
                </div>
            </td>
            <td class="hide-sm symbol">
                ${coin.conflicts ? '<span title="Conflicts detected" style="color:#d9534f;font-weight:bold;margin-right:6px;">⚠</span>' : ''}
                ${coin.symbol}
            </td>
            <td data-sort="${coin.price || 0}">${coin.formatted.price}</td>
            <td class="hide-md">
                ${coin.pegged_asset ? `<span class="metric-highlight peg-${pegClass}">${coin.pegged_asset}</span>` : '-'}
            </td>
            <td data-sort="${coin.circulating_mcap || 0}">${coin.formatted.mcap}</td>
            <td class="hide-sm" data-sort="${coin.dominance || 0}">
                <span class="metric-highlight">${coin.formatted.dominance}</span>
            </td>
            <td class="hide-sm" data-sort="${coin.volume_24h || 0}">${coin.formatted.volume}</td>
            <td class="hide-sm platforms" data-sort="${coin.platforms ? coin.platforms.length : 0}">
                ${coin.formatted.platforms}
            </td>
        `;
        
        return row;
    }
    
    /**
     * Update charts with filtered data
     */
    updateCharts() {
        // This will be implemented when we update the chart functionality
        // For now, we'll trigger a custom event that the chart code can listen to
        if (window.StablecoinFilterEvents) {
            window.dispatchEvent(new CustomEvent('stablecoinDataFiltered', {
                detail: { filteredData: this.filteredData }
            }));
        }
    }
    
    /**
     * Update results count display
     */
    updateResultsCount() {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            const total = this.originalData.length;
            const filtered = this.filteredData.length;
            resultsCount.textContent = filtered === total 
                ? `Showing all ${total} results`
                : `Showing ${filtered} of ${total} results`;
        }
    }
    
    /**
     * Update active filters display
     */
    updateActiveFiltersDisplay() {
        const activeFilters = document.getElementById('activeFilters');
        const filterBadges = document.getElementById('filterBadges');
        
        if (!activeFilters || !filterBadges) return;
        
        const badges = this.generateFilterBadges();
        
        if (badges.length > 0) {
            activeFilters.style.display = 'block';
            filterBadges.innerHTML = badges.join('');
        } else {
            activeFilters.style.display = 'none';
        }
    }
    
    /**
     * Generate filter badge HTML
     */
    generateFilterBadges() {
        const badges = [];
        
        // Asset type badges
        const enabledAssetTypes = Object.entries(this.state.assetTypes)
            .filter(([type, enabled]) => !enabled)
            .map(([type]) => type);
        
        if (enabledAssetTypes.length > 0 && enabledAssetTypes.length < 5) {
            const disabledTypes = enabledAssetTypes.map(type => 
                type.charAt(0).toUpperCase() + type.slice(1)
            );
            badges.push(`<span class="filter-badge">Hiding: ${disabledTypes.join(', ')}</span>`);
        }
        
        // Price range badge
        if (this.state.priceRange.enabled) {
            badges.push(`<span class="filter-badge">Price: $${this.state.priceRange.min} - $${this.state.priceRange.max}</span>`);
        }
        
        // Market cap range badge
        if (this.state.mcapRange.enabled) {
            badges.push(`<span class="filter-badge">Market Cap: $${this.state.mcapRange.min}M - $${this.state.mcapRange.max}M</span>`);
        }
        
        // Volume range badge
        if (this.state.volumeRange.enabled) {
            badges.push(`<span class="filter-badge">Volume: $${this.state.volumeRange.min}K - $${this.state.volumeRange.max}K</span>`);
        }
        
        // Platform badges
        if (this.state.platforms.selected.length > 0) {
            const platformList = this.state.platforms.selected.slice(0, 3).join(', ');
            const extra = this.state.platforms.selected.length > 3 ? ` +${this.state.platforms.selected.length - 3}` : '';
            badges.push(`<span class="filter-badge">Platforms: ${platformList}${extra}</span>`);
        }
        
        if (this.state.platforms.crossChainOnly) {
            badges.push(`<span class="filter-badge">Cross-chain only</span>`);
        }
        
        if (this.state.platforms.minBlockchainCount > 1) {
            badges.push(`<span class="filter-badge">Min ${this.state.platforms.minBlockchainCount} blockchains</span>`);
        }
        
        // Data quality badges
        if (this.state.dataQuality.hideConflicts) {
            badges.push(`<span class="filter-badge">No conflicts</span>`);
        }
        
        if (this.state.dataQuality.completeDataOnly) {
            badges.push(`<span class="filter-badge">Complete data only</span>`);
        }
        
        // Search badge
        if (this.state.search.query) {
            badges.push(`<span class="filter-badge">Search: "${this.state.search.query}"</span>`);
        }
        
        return badges;
    }
    
    /**
     * Clear all filters and reset to default state
     */
    clearAllFilters() {
        // Reset state
        this.state = {
            assetTypes: {
                fiat: true,
                commodities: true,
                crypto: true,
                tokenized: true,
                other: true
            },
            priceRange: {
                min: 0.50,
                max: 2.00,
                enabled: false
            },
            mcapRange: {
                min: 1,
                max: 100000,
                enabled: false,
                logScale: true
            },
            volumeRange: {
                min: 100,
                max: 10000000,
                enabled: false,
                logScale: true
            },
            platforms: {
                selected: [],
                crossChainOnly: false,
                minBlockchainCount: 1
            },
            dataQuality: {
                hideConflicts: false,
                completeDataOnly: false
            },
            search: {
                query: ''
            }
        };
        
        // Update UI
        this.updateFilterUI();
        
        // Apply filters (which will show all data)
        this.applyFilters();
        
        // Save preferences
        this.saveFilterPreferences();
    }
    
    /**
     * Update filter UI elements to match current state
     */
    updateFilterUI() {
        // Asset type checkboxes
        Object.entries(this.state.assetTypes).forEach(([type, enabled]) => {
            const checkbox = document.getElementById(`filter_${type}`);
            if (checkbox) checkbox.checked = enabled;
        });
        
        // Price range inputs
        const priceMin = document.getElementById('priceMin');
        const priceMax = document.getElementById('priceMax');
        const priceRangeMin = document.getElementById('priceRangeMin');
        const priceRangeMax = document.getElementById('priceRangeMax');
        
        if (priceMin) priceMin.value = this.state.priceRange.min;
        if (priceMax) priceMax.value = this.state.priceRange.max;
        if (priceRangeMin) priceRangeMin.value = this.state.priceRange.min;
        if (priceRangeMax) priceRangeMax.value = this.state.priceRange.max;
        
        // Market cap range inputs
        const mcapMin = document.getElementById('mcapMin');
        const mcapMax = document.getElementById('mcapMax');
        const mcapLogScale = document.getElementById('mcapLogScale');
        
        if (mcapMin) mcapMin.value = this.state.mcapRange.min;
        if (mcapMax) mcapMax.value = this.state.mcapRange.max;
        if (mcapLogScale) mcapLogScale.checked = this.state.mcapRange.logScale;
        
        // Volume range inputs
        const volumeMin = document.getElementById('volumeMin');
        const volumeMax = document.getElementById('volumeMax');
        const volumeLogScale = document.getElementById('volumeLogScale');
        
        if (volumeMin) volumeMin.value = this.state.volumeRange.min;
        if (volumeMax) volumeMax.value = this.state.volumeRange.max;
        if (volumeLogScale) volumeLogScale.checked = this.state.volumeRange.logScale;
        
        // Platform filters
        const platformSelect = document.getElementById('platformSelect');
        if (platformSelect) {
            Array.from(platformSelect.options).forEach(option => {
                option.selected = this.state.platforms.selected.includes(option.value);
            });
        }
        
        const crossChainOnly = document.getElementById('filter_crosschain');
        if (crossChainOnly) crossChainOnly.checked = this.state.platforms.crossChainOnly;
        
        const blockchainCount = document.getElementById('blockchainCount');
        if (blockchainCount) blockchainCount.value = this.state.platforms.minBlockchainCount;
        
        // Data quality filters
        const hideConflicts = document.getElementById('filter_hideConflicts');
        if (hideConflicts) hideConflicts.checked = this.state.dataQuality.hideConflicts;
        
        const completeDataOnly = document.getElementById('filter_completeDataOnly');
        if (completeDataOnly) completeDataOnly.checked = this.state.dataQuality.completeDataOnly;
        
        // Search filter
        const searchFilter = document.getElementById('searchFilter');
        if (searchFilter) searchFilter.value = this.state.search.query;
    }
    
    /**
     * Save filter preferences to localStorage
     */
    saveFilterPreferences() {
        try {
            localStorage.setItem('stablecoinFilters', JSON.stringify(this.state));
        } catch (e) {
            console.warn('Failed to save filter preferences:', e);
        }
    }
    
    /**
     * Load filter preferences from localStorage
     */
    loadFilterPreferences() {
        try {
            const saved = localStorage.getItem('stablecoinFilters');
            if (saved) {
                const parsedState = JSON.parse(saved);
                // Merge with current state to handle new filter options
                this.state = { ...this.state, ...parsedState };
            }
        } catch (e) {
            console.warn('Failed to load filter preferences:', e);
        }
    }
    
    /**
     * Get current filtered data
     */
    getFilteredData() {
        return this.filteredData;
    }
    
    /**
     * Get current filter state
     */
    getFilterState() {
        return { ...this.state };
    }
}

// Initialize filter system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Make filter manager globally available
    window.StablecoinFilterManager = new FilterManager();
    
    // Set up flag for chart updates
    window.StablecoinFilterEvents = true;
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterManager;
}