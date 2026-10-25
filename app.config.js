const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const http = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000').startsWith('http://');
const why = 'LifeLine uses your location to dispatch you to the nearest emergency and to show your ambulance live.';
module.exports = { expo: {
  name: 'LifeLine Driver', slug: 'lifeline-driver', version: '1.0.0', sdkVersion: '58.0.0', orientation: 'portrait', userInterfaceStyle: 'light',
  ios: { bundleIdentifier: 'com.lifeline.driver', ...(key ? { config: { googleMapsApiKey: key } } : {}),
    infoPlist: { NSLocationWhenInUseUsageDescription: why, NSCameraUsageDescription: 'Take photos of your license, RC book and profile.', NSPhotoLibraryUsageDescription: 'Choose photos of your license, RC book and profile.' } },
  android: { package: 'com.lifeline.driver', ...(key ? { config: { googleMaps: { apiKey: key } } } : {}), permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'VIBRATE', 'CAMERA'] },
  plugins: [
    'expo-asset',
    'expo-font',
    'expo-secure-store',
    'expo-status-bar',
    ['expo-location', { locationWhenInUsePermission: why }],
    ['expo-image-picker', { photosPermission: 'Choose photos of your license, RC book and profile.', cameraPermission: 'Take photos of your license, RC book and profile.' }],
  ],

} };
