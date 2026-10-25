// Large full-screen popup for an incoming emergency. The siren is driven by DriverContext (rings while any offer is 'active').
import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Animated, Easing, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from './ui';
import { useDriver } from '../DriverContext';
import { errMsg } from '../api';
import { C } from '../theme';

export default function OfferModal() {
  const { offers, acceptOffer, rejectOffer } = useDriver();
  const o = offers[0];
  const pulse = useRef(new Animated.Value(0)).current, bar = useRef(new Animated.Value(1)).current;

  useEffect(() => { const a = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  useEffect(() => {                                   // visual countdown only; the server decides expiry via booking:expired
    if (!o?.expiresInMs) return; bar.setValue(1);
    const a = Animated.timing(bar, { toValue: 0, duration: o.expiresInMs, easing: Easing.linear, useNativeDriver: false }); a.start(); return () => a.stop();
  }, [o?.id]);

  if (!o) return null;
  const closed = o.state === 'taken' || o.state === 'expired', accepting = o.state === 'accepting';
  const ring = { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: closed ? C.mute : C.red,
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }] };

  const accept = async () => { try { await acceptOffer(o.id); } catch (e) { Alert.alert('Could not accept', errMsg(e)); } };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={s.back}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            {!closed && <Animated.View style={ring} />}
            <View style={[s.icon, closed && { backgroundColor: C.mute }]}><Ionicons name={closed ? 'close' : 'medkit'} size={42} color="#fff" /></View>
          </View>

          {closed ? (
            <>
              <Text style={[s.title, { color: C.mute }]}>{o.message}</Text>
              <Text style={s.sub}>{o.state === 'taken' ? 'Another ambulance is already responding.' : 'This request is no longer available.'}</Text>
            </>
          ) : (
            <>
              <Text style={s.title}>Emergency request</Text>
              <Text style={s.sub}>Someone nearby needs an ambulance now</Text>
              <View style={s.stats}>
                <View style={s.stat}><Text style={s.v}>{o.distanceKm != null ? o.distanceKm.toFixed(1) : '–'}<Text style={s.u}> km</Text></Text><Text style={s.l}>Pickup distance</Text></View>
                <View style={s.sep} />
                <View style={s.stat}><Text style={s.v}>{o.etaMinutes ?? '–'}<Text style={s.u}> min</Text></Text><Text style={s.l}>Approx. arrival</Text></View>
              </View>
              {!!o.expiresInMs && <View style={s.track}><Animated.View style={[s.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>}
            </>
          )}

          <View style={{ marginTop: 22, opacity: closed ? 0.4 : 1 }}>
            {accepting ? <View style={s.wait}><ActivityIndicator color={C.ok} /><Text style={s.waitT}>Accepting…</Text></View> : (<>
              <Btn big variant="ok" icon="checkmark-circle" title="ACCEPT" onPress={accept} disabled={closed} />
              <Btn variant="outline" icon="close-circle-outline" title="Reject" onPress={() => rejectOffer(o.id)} disabled={closed} style={{ marginTop: 12, height: 54 }} />
            </>)}
          </View>
          {offers.length > 1 && <Text style={s.more}>+{offers.length - 1} more request{offers.length > 2 ? 's' : ''} waiting</Text>}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(5,12,30,0.88)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 24, alignItems: 'stretch' },
  iconWrap: { alignSelf: 'center', width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 18 },
  icon: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center' }, sub: { color: C.mute, textAlign: 'center', marginTop: 4, fontSize: 14 },
  stats: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 20, paddingVertical: 16, marginTop: 20 },
  stat: { flex: 1, alignItems: 'center' }, sep: { width: 1, backgroundColor: C.line },
  v: { fontSize: 30, fontWeight: '900', color: C.navy }, u: { fontSize: 15, color: C.mute, fontWeight: '600' }, l: { fontSize: 12, color: C.mute, marginTop: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.line, marginTop: 16, overflow: 'hidden' }, fill: { height: 6, backgroundColor: C.red },
  wait: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, waitT: { marginLeft: 10, fontWeight: '700', color: C.ok, fontSize: 17 },
  more: { textAlign: 'center', color: C.mute, marginTop: 14, fontSize: 13 },
});
