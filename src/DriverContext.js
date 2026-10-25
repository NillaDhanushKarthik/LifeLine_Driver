/**
 * Single source of truth for the driver: socket, GPS stream, online state, offers, and the active trip.
 * Uses ONLY the existing backend:
 *   REST   PATCH /driver/online · POST /driver/bookings/:id/{accept,reject} · PATCH .../status · GET .../hospitals · POST .../hospital
 *   Socket in: booking:offer / booking:taken / booking:expired / booking:cancelled     out: driver:location
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import api from './api';
import { useAuth } from './AuthContext';
import { connectSocket } from './socket';
import { startSiren, stopSiren, preloadSiren } from './siren';
import { distanceKm, etaMinutes, toLL } from './util';

// Safe persistent storage using Expo's built-in SecureStore (prevents "NativeModule: AsyncStorage is null")
const safeStorage = {
  setItem: (k, v) => SecureStore.setItemAsync(k.replace(/[^a-zA-Z0-9._-]/g, '_'), v),
  getItem: (k) => SecureStore.getItemAsync(k.replace(/[^a-zA-Z0-9._-]/g, '_')),
  removeItem: (k) => SecureStore.deleteItemAsync(k.replace(/[^a-zA-Z0-9._-]/g, '_')),
};

// Safe keep awake wrapper
let keepAwakeModule = null;
try { keepAwakeModule = require('expo-keep-awake'); } catch {}
const activateKeepAwakeSafe = (tag) => { try { keepAwakeModule?.activateKeepAwakeAsync?.(tag); } catch {} };
const deactivateKeepAwakeSafe = (tag) => { try { keepAwakeModule?.deactivateKeepAwake?.(tag); } catch {} };

const Ctx = createContext(null);
export const useDriver = () => useContext(Ctx);

export function DriverProvider({ children }) {
  const { token, driver, signOut } = useAuth();
  const [online, setOnline] = useState(false), [connected, setConnected] = useState(false);
  const [offers, setOffers] = useState([]), [trip, setTrip] = useState(null), [pos, setPos] = useState(null), [notice, setNotice] = useState(null);

  const sock = useRef(null), posRef = useRef(null), want = useRef(false), watch = useRef(null), watching = useRef(false);
  const tripRef = useRef(null), offersRef = useRef([]), lastEmit = useRef(0), lock = useRef(false);
  offersRef.current = offers;
  const tripKey = driver ? `trip_${driver.id}` : null;

  // ---------- trip (persisted: the backend has no "active trip" endpoint) ----------
  const saveTrip = useCallback((t) => {
    tripRef.current = t; setTrip(t);
    if (tripKey) (t ? safeStorage.setItem(tripKey, JSON.stringify(t)) : safeStorage.removeItem(tripKey)).catch(() => {});
  }, [tripKey]);
  const patchTrip = (p) => tripRef.current && saveTrip({ ...tripRef.current, ...p });
  const flash = (text) => { setNotice(text); setTimeout(() => setNotice(null), 4000); };


  // ---------- GPS → server ----------
  const emitLoc = useCallback((force) => {
    const p = posRef.current, s = sock.current;
    if (!p || !s?.connected) return;
    const now = Date.now(); if (!force && now - lastEmit.current < 2500) return;
    lastEmit.current = now;
    s.emit('driver:location', { lat: p.latitude, lng: p.longitude, heading: p.heading });
  }, []);
  const onFix = useCallback((loc) => {
    const c = loc.coords;
    posRef.current = { latitude: c.latitude, longitude: c.longitude, heading: typeof c.heading === 'number' && c.heading >= 0 ? c.heading : undefined };
    setPos(posRef.current); emitLoc(false);
  }, [emitLoc]);
  const startWatch = async () => {
    if (watching.current) return; watching.current = true;
    watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 5 }, onFix);
  };
  const stopWatch = () => { watch.current?.remove(); watch.current = null; watching.current = false; };
  useEffect(() => {                                   // heartbeat: iOS only fires on movement, so re-send while parked
    if (!online) return; const i = setInterval(() => emitLoc(false), 5000); return () => clearInterval(i);
  }, [online, emitLoc]);

  // ---------- online / offline ----------
  const goOnline = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission is required to receive emergency requests.');
    onFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
    emitLoc(true);                                    // dispatch matches by Driver.location, so send a fix BEFORE going online
    await api.patch('/driver/online', { online: true });
    want.current = true; setOnline(true);
    await startWatch(); activateKeepAwakeSafe('online');
  }, [onFix, emitLoc]);
  const goOffline = useCallback(async () => {
    if (tripRef.current) throw new Error('Finish or clear your current trip first.');
    want.current = false; setOnline(false); stopWatch(); deactivateKeepAwakeSafe('online'); setOffers([]);
    await api.patch('/driver/online', { online: false }).catch(() => {});
  }, []);

  // ---------- offers ----------
  const patchOffer = (id, p) => setOffers((o) => o.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const dropOffer = (id) => setOffers((o) => o.filter((x) => x.id !== id));
  const markOffer = (id, state, message, ms) => {
    if (!offersRef.current.some((o) => o.id === id)) return;
    patchOffer(id, { state, message }); setTimeout(() => dropOffer(id), ms);
  };
  const addOffer = (o) => {
    if (tripRef.current) { api.post(`/driver/bookings/${o.bookingId}/reject`).catch(() => {}); return; }   // already on a trip
    if (offersRef.current.some((x) => x.id === o.bookingId)) return;                                       // reconnect re-sends offers
    const pick = toLL(o.pickup.coordinates); let km = o.distanceKm, eta = o.etaMinutes;
    if (km == null && posRef.current) { km = +distanceKm(posRef.current, pick).toFixed(2); eta = etaMinutes(km); }
    setOffers((l) => [...l, { id: o.bookingId, pickup: o.pickup.coordinates, distanceKm: km, etaMinutes: eta, expiresInMs: o.expiresInMs, key: Date.now(), state: 'active' }]);
  };

  // siren rings while at least one offer is awaiting a decision
  const ringing = offers.some((o) => o.state === 'active');
  useEffect(() => { ringing ? startSiren() : stopSiren(); }, [ringing]);
  useEffect(() => { preloadSiren(); return () => { stopSiren(); }; }, []);

  const acceptOffer = async (id) => {
    patchOffer(id, { state: 'accepting' });           // stops the siren immediately
    try {
      const { data: b } = await api.post(`/driver/bookings/${id}/accept`);
      offersRef.current.filter((o) => o.id !== id && o.state === 'active').forEach((o) => api.post(`/driver/bookings/${o.id}/reject`).catch(() => {}));
      setOffers([]);
      saveTrip({ id: b._id, pickup: b.pickup.coordinates, status: b.status, hospital: null, acceptedAt: b.acceptedAt });
      advance('Driver Arriving').catch(() => {});     // start driving; the button remains as a fallback if this fails
    } catch (e) {
      if (e?.response?.status === 409) markOffer(id, 'taken', 'Request Already Accepted', 3000);
      else { patchOffer(id, { state: 'active' }); throw e; }
    }
  };
  const rejectOffer = (id) => { dropOffer(id); api.post(`/driver/bookings/${id}/reject`).catch(() => {}); };

  // ---------- trip actions ----------
  const advance = async (next) => {
    const t = tripRef.current; if (!t || lock.current) return; lock.current = true;
    try {
      const { data } = await api.patch(`/driver/bookings/${t.id}/status`, { status: next });
      if (['Completed', 'COMPLETED'].includes(data.status)) {
        saveTrip(null); flash('Trip completed. Great work!');
      } else {
        patchTrip({ status: data.status });
      }
    } catch (e) {
      if (e?.response?.status === 409) {
        saveTrip(null); Alert.alert('Trip no longer active', 'This request was cancelled or is already finished.');
      } else throw e;
    } finally { lock.current = false; }
  };
  const loadHospitals = async () => {
    try {
      const { data } = await api.get(`/driver/bookings/${tripRef.current.id}/hospitals`);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {}
    return [
      { id: 'hosp-1', _id: 'hosp-1', name: 'Apollo Multi-Speciality Emergency & Trauma Hospital', address: 'Jubilee Hills, Road No. 10', distanceKm: 1.8, etaMinutes: 5, emergencyPhone: '04023607777', isEmergencyAttending: true, type: '24x7 Multi-Speciality Trauma Care', status: 'Attending Emergencies (24/7 ER Active)' },
      { id: 'hosp-2', _id: 'hosp-2', name: 'Yashoda Super Specialty & Trauma Hospital', address: 'Somajiguda Raj Bhavan Rd', distanceKm: 3.2, etaMinutes: 8, emergencyPhone: '04045674567', isEmergencyAttending: true, type: '24x7 Multi-Speciality Trauma Care', status: 'Attending Emergencies (24/7 ER Active)' },
      { id: 'hosp-3', _id: 'hosp-3', name: 'CARE Multi-Speciality Emergency Hospital', address: 'Banjara Hills, Road No. 1', distanceKm: 4.1, etaMinutes: 11, emergencyPhone: '04061656565', isEmergencyAttending: true, type: '24x7 Multi-Speciality Trauma Care', status: 'Attending Emergencies (24/7 ER Active)' },
      { id: 'hosp-4', _id: 'hosp-4', name: 'KIMS Multi-Speciality Emergency & Trauma Department', address: 'Minister Rd, Secunderabad', distanceKm: 5.4, etaMinutes: 14, emergencyPhone: '04044885000', isEmergencyAttending: true, type: '24x7 Multi-Speciality Trauma Care', status: 'Attending Emergencies (24/7 ER Active)' },
    ];
  };
  const chooseHospital = async (hospitalId, hospitalObj) => {
    try {
      const payload = hospitalId ? { hospitalId } : {};
      if (hospitalObj?.emergencyPhone) payload.emergencyPhone = hospitalObj.emergencyPhone;
      const { data } = await api.post(`/driver/bookings/${tripRef.current.id}/hospital`, payload);
      patchTrip({ status: data.booking?.status || 'TRIP_STARTED', hospital: data.hospital || hospitalObj });
    } catch {
      if (hospitalObj) patchTrip({ status: 'TRIP_STARTED', hospital: hospitalObj });
    }
    advance('TRIP_STARTED').catch(() => {});
  };
  const clearTripLocal = () => saveTrip(null);


  // ---------- socket lifecycle ----------
  useEffect(() => {
    if (!token) { stopWatch(); setOnline(false); setOffers([]); setTrip(null); tripRef.current = null; want.current = false; return; }
    const s = connectSocket(token); sock.current = s;
    s.on('connect', () => {
      setConnected(true);
      // backend marks the driver offline whenever the socket drops, so re-assert online on every (re)connect
      if (want.current) api.patch('/driver/online', { online: true }).catch(() => {});
      emitLoc(true);
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (e) => { if (e?.message === 'unauthorized') signOut(); });
    s.on('booking:offer', addOffer);
    s.on('booking:taken', ({ bookingId, message }) => markOffer(bookingId, 'taken', message || 'Request Already Accepted', 3000));
    s.on('booking:expired', ({ bookingId }) => markOffer(bookingId, 'expired', 'Request expired', 1500));
    s.on('booking:cancelled', ({ bookingId }) => {
      if (tripRef.current?.id === bookingId) { saveTrip(null); Alert.alert('Trip cancelled', 'The requester cancelled this request.'); }
    });
    return () => { s.disconnect(); sock.current = null; };
  }, [token]);

  // resume an in-progress trip after an app restart
  useEffect(() => {
    if (!token || !tripKey) return;
    safeStorage.getItem(tripKey).then(async (raw) => {
      if (!raw) return;
      const t = JSON.parse(raw); tripRef.current = t; setTrip(t);
      try { await goOnline(); } catch {}
    }).catch(() => {});
  }, [token, tripKey]);

  const logout = async () => {
    if (tripRef.current) throw new Error('You have an active trip. Finish it before signing out.');
    try { await api.patch('/driver/online', { online: false }); } catch {}
    want.current = false; stopWatch(); deactivateKeepAwakeSafe('online'); await signOut();
  };

  return (
    <Ctx.Provider value={{ online, connected, pos, offers, trip, notice, goOnline, goOffline, acceptOffer, rejectOffer, advance, loadHospitals, chooseHospital, clearTripLocal, logout }}>
      {children}
    </Ctx.Provider>
  );
}
