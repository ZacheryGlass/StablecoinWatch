# Domain Services

This directory contains domain-specific business logic services that encapsulate core application concepts and rules.

## AssetClassifier

The `AssetClassifier` is a centralized service for classifying digital assets into categories (stablecoins, tokenized assets, etc.) and identifying specific pegged asset types.

### Purpose

- Replaces hardcoded classification logic scattered across data fetchers
- Provides consistent asset categorization across all data sources
- Enables config-driven taxonomy rules for easy customization
- Supports performance-optimized classification for large datasets

### Usage

```javascript
const AssetClassifier = require('./AssetClassifier');
const ApiConfig = require('../../config/ApiConfig');

// Initialize with configuration
const config = ApiConfig.getAssetClassificationConfig();
const classifier = new AssetClassifier(config);

// Classify an asset
const result = classifier.classify({
    tags: ['tokenized-gold'],
    name: 'PAX Gold',
    symbol: 'PAXG',
    slug: 'pax-gold'
});

console.log(result);
// Output: { assetCategory: 'Tokenized Asset', peggedAsset: 'Gold' }
```

### Classification Categories

#### Asset Categories
- **Stablecoin**: Fiat-pegged stablecoins (USD, EUR, etc.)
- **Tokenized Asset**: Real-world asset tokens (RWA)
- **Other**: Assets that don't fit the above categories

#### Pegged Asset Types
- **Gold**: Gold-backed tokens
- **Silver**: Silver-backed tokens  
- **ETF**: Exchange-traded fund tokens
- **Stocks**: Equity-backed tokens
- **Real Estate**: Property-backed tokens
- **Treasury Bills**: Government bond tokens
- **Commodities**: General commodity-backed tokens
- **Tokenized Asset**: Generic tokenized asset (fallback)

### Classification Logic

The classifier uses a multi-layer approach for maximum accuracy:

1. **Tag-based Detection** (highest priority)
   - Specific tags: `tokenized-gold`, `tokenized-silver`, etc.
   - Category tags: `stablecoin`, `tokenized-assets`

2. **Symbol Pattern Matching** (medium priority)
   - Gold: `XAU`, `PAXG`, `XAUT`
   - Silver: `XAG`

3. **Name/Slug Heuristics** (fallback)
   - Text patterns in asset name or slug
   - Case-insensitive matching

### Configuration

#### Default Taxonomy

```javascript
const defaultTaxonomy = {
    stablecoinTags: ['stablecoin'],
    tokenizedAssetTags: ['tokenized-assets'],
    tokenizedSubtypes: {
        'tokenized-gold': 'Gold',
        'tokenized-silver': 'Silver',
        'tokenized-etfs': 'ETF',
        'tokenized-stock': 'Stocks',
        'tokenized-real-estate': 'Real Estate',
        'tokenized-treasury-bills': 'Treasury Bills',
        'tokenized-commodities': 'Commodities'
    },
    assetBackedTags: ['asset-backed-stablecoin'],
    patterns: {
        goldSymbols: 'xau|paxg|xaut',
        goldNames: 'gold',
        silverSymbols: 'xag',
        silverNames: 'silver',
        etf: 'etf',
        treasury: 'treasury',
        stock: 'stock',
        realEstate: 'real estate|real-estate|estate'
    }
};
```

#### Environment Variables

- `ASSET_CLASSIFICATION_ENABLED`: Enable/disable classification (default: `true`)
- `CUSTOM_STABLECOIN_TAGS`: Additional stablecoin tags (comma-separated)
- `CUSTOM_TOKENIZED_TAGS`: Additional tokenized asset tags (comma-separated)

Example:
```bash
ASSET_CLASSIFICATION_ENABLED=true
CUSTOM_STABLECOIN_TAGS=stable,fiat-backed,dollar-pegged
CUSTOM_TOKENIZED_TAGS=rwa,real-world-assets,tokenized
```

### Integration with Data Fetchers

Data fetchers should use the AssetClassifier in their `transformToStandardFormat()` method:

```javascript
const AssetClassifier = require('../domain/AssetClassifier');
const ApiConfig = require('../../config/ApiConfig');

class ExampleDataFetcher {
    constructor() {
        const config = ApiConfig.getAssetClassificationConfig();
        this.classifier = new AssetClassifier(config);
    }

    transformToStandardFormat(rawData) {
        return rawData.map(coin => {
            // Classify the asset
            const classification = this.classifier.classify({
                tags: coin.tags || [],
                name: coin.name,
                symbol: coin.symbol,
                slug: coin.slug
            });

            return {
                // ... other fields
                assetCategory: classification.assetCategory,
                metadata: {
                    // ... other metadata
                    peggedAsset: classification.peggedAsset
                }
            };
        });
    }
}
```

### Performance Considerations

The AssetClassifier is optimized for performance:

- **Pre-compiled Patterns**: Regex patterns are compiled once during initialization
- **Set Lookups**: Tag matching uses O(1) Set operations
- **Minimal Allocations**: Reuses normalized data for multiple checks
- **Batching-Ready**: Designed for processing large datasets efficiently

Performance targets:
- 1000+ classifications per 100ms on typical hardware
- Consistent performance regardless of tag array size
- Memory-efficient operation for large datasets

### Testing

Comprehensive unit tests cover:
- All classification scenarios
- Edge cases and error handling
- Performance benchmarks
- Configuration variations
- Environment variable handling

Run tests:
```bash
npm test tests/services/domain/AssetClassifier.test.js
```

### Migration from Hardcoded Logic

When migrating from hardcoded classification logic:

1. **Extract Current Rules**: Identify existing tag arrays and pattern matching
2. **Configure Taxonomy**: Add rules to ApiConfig taxonomy section
3. **Replace Logic**: Replace inline classification with AssetClassifier calls
4. **Update Tests**: Ensure existing behavior is preserved
5. **Validate Results**: Compare outputs before and after migration

### Future Enhancements

Potential extensions:
- Machine learning-based classification
- External taxonomy API integration
- Dynamic rule updates without restart
- Classification confidence scoring
- Multi-language name pattern support