const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wav');   // siren.wav is bundled as an asset
config.maxWorkers = 1;
module.exports = config;
