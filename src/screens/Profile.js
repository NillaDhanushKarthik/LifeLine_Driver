import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from '../components/ui';
import { useAuth } from '../AuthContext';
import { useDriver } from '../DriverContext';
import { errMsg } from '../api';
import { C } from '../theme';

// Backend has no GET /driver/me, so this shows what login returned (name, vehicle) plus the phone used to sign in.
const Row = ({ icon, label, value }) => (
  <View style={s.row}>
    <View style={s.ri}><Ionicons name={icon} size={20} color={C.blue} /></View>
    <View style={{ marginLeft: 14 }}>
      <Text style={s.rl}>{label}</Text>
      <Text style={s.rv}>{value || '–'}</Text>
    </View>
  </View>
);

export default function Profile() {
  const { driver, signOut } = useAuth();
  const { logout } = useDriver();
  const [busy, setBusy] = useState(false);

  const doSignOut = async () => {
    setBusy(true);
    try {
      if (logout) {
        await logout();
      } else if (signOut) {
        await signOut();
      }
    } catch (e) {
      // Force local signout even if server error occurred
      try {
        if (signOut) await signOut();
      } catch (err) {}
    } finally {
      setBusy(false);
    }
  };

  const out = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Sign out?\n\nYou will stop receiving emergency requests.')) {
          doSignOut();
        }
      } else {
        doSignOut();
      }
      return;
    }

    Alert.alert(
      'Sign out?',
      'You will stop receiving emergency requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doSignOut }
      ]
    );
  };

  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20 }}>
      <View style={s.head}>
        <View style={s.avatar}><Ionicons name="person" size={36} color={C.blue} /></View>
        <Text style={s.name}>{driver?.fullName || driver?.name || 'Ambulance Driver'}</Text>
        <View style={s.badge}>
          <Ionicons name="shield-checkmark" size={14} color={C.ok} />
          <Text style={s.badgeT}>Verified by hospital</Text>
        </View>
      </View>
      <Row icon="call-outline" label="Phone" value={driver?.phone} />
      <Row icon="car-outline" label="Ambulance registration" value={driver?.ambulanceNumber || driver?.vehicleNumber || 'Registered Unit'} />
      <Btn title="Sign out" variant="outline" onPress={out} loading={busy} style={{ marginTop: 26 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', marginVertical: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 23, fontWeight: '900', color: C.text, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5F6EC', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginTop: 8 },
  badgeT: { color: C.ok, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: C.bg, marginBottom: 10 },
  ri: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  rl: { color: C.mute, fontSize: 12 },
  rv: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
});
