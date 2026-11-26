import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import storage from './storage';
import { setToken, setUnauthorizedHandler } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// driver = { id, fullName, vehicleNumber, phone }  (login response + the phone typed at login)
export function AuthProvider({ children }) {
  const [s, setS] = useState({ loading: true, token: null, driver: null });
  const signOut = useCallback(async () => {
    setToken(null); await storage.deleteItem('dtoken'); await storage.deleteItem('ddriver');
    setS({ loading: false, token: null, driver: null });
  }, []);
  const signIn = async (token, driver) => {
    setToken(token); await storage.setItem('dtoken', token); await storage.setItem('ddriver', JSON.stringify(driver));
    setS({ loading: false, token, driver });
  };
  useEffect(() => {
    setUnauthorizedHandler(signOut);                 // any 401 -> back to login
    (async () => {
      const t = await storage.getItem('dtoken');
      let d = null; try { d = JSON.parse(await storage.getItem('ddriver')); } catch {}
      if (t) {
        setToken(t);
        setS({ loading: false, token: t, driver: d });
        // Automatically sync latest driver profile from server
        api.get('/auth/me').then(async (res) => {
          if (res?.data?.driver) {
            const updated = {
              ...(d || {}),
              ...res.data.driver,
              fullName: res.data.user?.fullName || res.data.driver?.name || d?.fullName || 'Driver',
              vehicleNumber: res.data.driver?.ambulanceNumber || res.data.driver?.vehicleNumber || d?.vehicleNumber || 'Ambulance',
              phone: res.data.user?.phone || d?.phone,
            };
            await storage.setItem('ddriver', JSON.stringify(updated));
            setS({ loading: false, token: t, driver: updated });
          }
        }).catch(() => {});
      } else {
        setS({ loading: false, token: null, driver: null });
      }
    })();
  }, []);
  return <Ctx.Provider value={{ ...s, signIn, signOut }}>{children}</Ctx.Provider>;
}
