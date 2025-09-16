const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

test('CMC EURT classification should be Stablecoin with EUR peggedAsset', () => {
    const classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    const sample = {
        tags: ['stablecoin', 'asset-backed-stablecoin', 'eur-stablecoin', 'fiat-stablecoin'],
        name: 'Tether EURt',
        symbol: 'EURt',
        slug: 'tether-eurt'
    };

    const result = classifier.classify({ asset: sample });
    expect(result.assetCategory).toBe('Stablecoin');
    expect(result.peggedAsset).toBe('EUR');
});
