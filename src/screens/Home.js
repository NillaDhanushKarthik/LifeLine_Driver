import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriver } from '../DriverContext';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';
import { getRoute } from '../directions';
import TripPanel from '../components/TripPanel';
import LeafletMap from '../components/LeafletMap';
import { C, shadow } from '../theme';
import { toLL, distanceKm, etaMinutes } from '../util';


export default function Home({ navigation }) {
  const { driver } = useAuth();
  const { online, connected, pos, trip, notice, goOnline, goOffline } = useDriver();
  const insets = useSafeAreaInsets();
  const map = useRef(null), lastRoute = useRef(0), radar = useRef(new Animated.Value(0)).current;
  const [route, setRoute] = useState(null), [switching, setSwitching] = useState(false);

  useEffect(() => { const a = Animated.loop(Animated.timing(radar, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);

  // ---- where are we heading? ----
  const pickup = trip ? toLL(trip.pickup) : null;
  const hosp = trip?.hospital?.location ? toLL(trip.hospital.location.coordinates) : null;
  const toHospital = trip && ['Hospital Notified', 'HOSPITAL_NOTIFIED', 'Trip Started', 'TRIP_STARTED'].includes(trip.status) && hosp;
  const target = trip ? (toHospital ? hosp : ['Patient Picked', 'PATIENT_PICKED'].includes(trip.status) ? null : pickup) : null;
  const targetLabel = toHospital ? (trip.hospital?.name || 'Hospital') : 'Patient pickup location';


  // Google Directions: road route + traffic ETA (refreshed ≤ every 20s)
  useEffect(() => {
    if (!pos || !target) { setRoute(null); return; }
    if (route && Date.now() - lastRoute.current < 20000) return;
    lastRoute.current = Date.now(); let on = true;
    getRoute(pos, target).then((r) => on && setRoute(r));
    return () => { on = false; };
  }, [Math.round((pos?.latitude || 0) * 1500), Math.round((pos?.longitude || 0) * 1500), target?.latitude, target?.longitude]);
  useEffect(() => { setRoute(null); lastRoute.current = 0; }, [target?.latitude, target?.longitude]);

  const straight = pos && target ? distanceKm(pos, target) : null;
  const distKm = route?.distanceKm ?? straight, etaMin = route?.etaMin ?? (straight != null ? etaMinutes(straight) : null);

  // ---- camera ----
  useEffect(() => {
    if (!map.current || !pos) return;
    if (target) map.current.fitToCoordinates([pos, target], { edgePadding: { top: 130, right: 60, bottom: 420, left: 60 }, animated: true });
    else map.current.animateCamera({ center: pos, zoom: 15 }, { duration: 600 });
  }, [!!pos, target?.latitude, target?.longitude, trip?.status, pos && !target && Math.round(pos.latitude * 800), pos && !target && Math.round(pos.longitude * 800)]);

  const toggle = async (next) => {
    setSwitching(true);
    try { next ? await goOnline() : await goOffline(); } catch (e) { Alert.alert(next ? 'Cannot go online' : 'Cannot go offline', errMsg(e)); }
    setSwitching(false);
  };
  const ring = { position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: C.blue,
    opacity: radar.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }), transform: [{ scale: radar.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] };

  const pill = !online ? ['Offline', C.mute] : connected ? ['Online', C.ok] : ['Reconnecting…', '#E8A500'];

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <LeafletMap
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 17.385, longitude: 78.4867, zoom: 14 }}
        driverLocation={pos}
        pickupLocation={trip && pickup ? pickup : null}
        hospitalLocation={hosp}
        route={route}
        online={online}
        activeTrip={!!trip}
      />


      <View style={[s.top, { top: insets.top + 10 }]}>
        <Pressable style={[s.round, shadow]} onPress={() => navigation.navigate('History')}><Ionicons name="time-outline" size={22} color={C.navy} /></Pressable>
        <View style={[s.status, shadow]}><View style={[s.dot, { backgroundColor: pill[1] }]} /><Text style={s.statusT}>{pill[0]}</Text></View>
        <Pressable style={[s.round, shadow]} onPress={() => navigation.navigate('Profile')}><Ionicons name="person-outline" size={22} color={C.navy} /></Pressable>
      </View>

      {!!notice && <View style={[s.notice, { top: insets.top + 68 }]}><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.noticeT}>{notice}</Text></View>}

      {trip ? <TripPanel target={target} targetLabel={targetLabel} etaMin={etaMin} distKm={distKm} /> : (
        <View style={[s.bottom, shadow, { paddingBottom: insets.bottom + 20 }]}>
          {online && (<View style={s.radarWrap}><Animated.View style={ring} /><View style={s.radarDot}><Ionicons name="pulse" size={34} color="#fff" /></View></View>)}
          <Text style={s.h}>{online ? 'Waiting for emergencies' : 'You are offline'}</Text>
          <Text style={s.sub}>{online ? 'Keep this screen open. A loud alert rings when a request arrives.' : 'Go online to start receiving emergency requests near you.'}</Text>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}><Text style={s.sw}>{online ? 'Online' : 'Offline'}</Text><Text style={s.swSub}>{driver?.vehicleNumber}</Text></View>
            <Switch value={online} disabled={switching} onValueChange={toggle} trackColor={{ false: '#C9D3E8', true: '#8FE0B1' }} thumbColor={online ? C.ok : '#fff'} style={{ transform: [{ scale: 1.35 }] }} />
          </View>
        </View>)}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, height: 40, borderRadius: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 }, statusT: { fontWeight: '800', color: C.navy },
  notice: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: C.ok, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 }, noticeT: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  pin: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, alignItems: 'center', padding: 22 },
  radarWrap: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, radarDot: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 23, fontWeight: '900', color: C.text }, sub: { color: C.mute, textAlign: 'center', marginTop: 6, fontSize: 14, maxWidth: 290, lineHeight: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', backgroundColor: C.bg, borderRadius: 22, padding: 18, paddingRight: 26, marginTop: 20 },
  sw: { fontSize: 20, fontWeight: '800', color: C.navy }, swSub: { color: C.mute, marginTop: 2, fontSize: 13 },
});
