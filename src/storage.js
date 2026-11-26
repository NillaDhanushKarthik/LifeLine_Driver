import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
      } catch (e) {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return null;
    }
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {}
  },
  async deleteItem(key) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {}
  },
};

export default storage;
