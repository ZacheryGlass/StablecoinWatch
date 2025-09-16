const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

test('CMC USDT classification should be Stablecoin with USD peggedAsset', () => {
    const classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    const sample = {
        tags: ['stablecoin', 'asset-backed-stablecoin', 'usd-stablecoin'],
        name: 'Tether USDt',
        symbol: 'USDT',
        slug: 'tether'
    };

    const result = classifier.classify({ asset: sample });
    expect(result.assetCategory).toBe('Stablecoin');
    expect(result.peggedAsset).toBe('USD');
});
