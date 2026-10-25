import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setToken, setUnauthorizedHandler } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// driver = { id, fullName, vehicleNumber, phone }  (login response + the phone typed at login)
export function AuthProvider({ children }) {
  const [s, setS] = useState({ loading: true, token: null, driver: null });
  const signOut = useCallback(async () => {
    setToken(null); await SecureStore.deleteItemAsync('dtoken'); await SecureStore.deleteItemAsync('ddriver');
    setS({ loading: false, token: null, driver: null });
  }, []);
  const signIn = async (token, driver) => {
    setToken(token); await SecureStore.setItemAsync('dtoken', token); await SecureStore.setItemAsync('ddriver', JSON.stringify(driver));
    setS({ loading: false, token, driver });
  };
  useEffect(() => {
    setUnauthorizedHandler(signOut);                 // any 401 -> back to login
    (async () => {
      const t = await SecureStore.getItemAsync('dtoken');
      let d = null; try { d = JSON.parse(await SecureStore.getItemAsync('ddriver')); } catch {}
      if (t && d) { setToken(t); setS({ loading: false, token: t, driver: d }); } else setS({ loading: false, token: null, driver: null });
    })();
  }, []);
  return <Ctx.Provider value={{ ...s, signIn, signOut }}>{children}</Ctx.Provider>;
}
