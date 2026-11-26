import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDevHost = () => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch {}
  return null;
};

const devHost = getDevHost();

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://lifeline-backend-fste.onrender.com';

export const GOOGLE_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const MAPTILER_KEY =
  process.env.EXPO_PUBLIC_MAPTILER_API_KEY || 'lgNJRgtlNXfW7gcwyOBF';