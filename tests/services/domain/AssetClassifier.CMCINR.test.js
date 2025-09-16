const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

test('CMC INR stablecoin classification should be Stablecoin with INR peggedAsset', () => {
    const classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    const sample = {
        tags: ['stablecoin', 'inr-stablecoin'],
        name: 'Indian Rupee Token',
        symbol: 'INRt',
        slug: 'indian-rupee-token'
    };

    const result = classifier.classify({ asset: sample });
    expect(result.assetCategory).toBe('Stablecoin');
    expect(result.peggedAsset).toBe('INR');
});
