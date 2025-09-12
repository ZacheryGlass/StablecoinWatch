# Documentation

This directory contains documentation for the StablecoinWatch API integrations and configuration.

## Structure

### Root Documentation
- `api-integration-guide.md` - Complete guide for integrating new data sources
- `configuration-guide.md` - Application configuration reference  
- `platform-analysis.md` - Platform detection and analysis results

### API-Specific Documentation

#### `/defillama/`
- `complete-api-docs.md` - Full DeFiLlama API documentation
- `openapi-schema.json` - OpenAPI 3.1 schema specification
- `stablecoin-endpoints.md` - Stablecoin-specific endpoint documentation

#### `/messari/`
- `asset-endpoints.md` - General asset API endpoints reference
- `stablecoin-endpoints.md` - Stablecoin-specific endpoint documentation

## Naming Convention

All documentation follows kebab-case naming:
- Use lowercase letters
- Separate words with hyphens (-)
- Use descriptive, specific names
- Prefer `.md` extension for text documentation
- Use `.json` for schema/specification files

## Integration Status

- ✅ **CMC (CoinMarketCap)** - Market data, rankings, logos
- ✅ **Messari** - Supply validation, metadata, network breakdown  
- ✅ **DeFiLlama** - Comprehensive chain coverage, peg mechanisms
- 🔄 **CoinGecko** - Configuration ready, implementation pending