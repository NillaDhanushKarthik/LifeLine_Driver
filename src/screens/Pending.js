import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout, Btn } from '../components/ui';
import api, { errMsg } from '../api'; import { useAuth } from '../AuthContext'; import { C } from '../theme';

/** Shown after registration and whenever login returns 403. "Check status" re-attempts login (no polling). */
export default function Pending({ navigation, route }) {
  const { signIn } = useAuth();
  const { phone, password, message } = route.params || {};
  const rejected = /rejected/i.test(message || '');
  const [busy, setBusy] = useState(false), [note, setNote] = useState(null);

  const check = async () => {
    setBusy(true); setNote(null);
    try { const { data } = await api.post('/auth/driver/login', { phone, password }); await signIn(data.token, { ...data.driver, phone }); }
    catch (e) { setBusy(false); setNote(e?.response?.status === 403 ? errMsg(e) : `Could not check: ${errMsg(e)}`); }
  };

  return (
    <AuthLayout title={rejected ? 'Verification rejected' : 'Pending Verification'} sub={rejected ? message : 'Your documents were sent to your hospital for review'}>
      <View style={s.center}>
        <View style={[s.ring, { backgroundColor: rejected ? '#FFE9EA' : C.soft }]}><Ionicons name={rejected ? 'close-circle' : 'hourglass'} size={42} color={rejected ? C.red : C.blue} /></View>
        <Text style={s.t}>{rejected ? 'Your account was not approved.' : 'You can sign in as soon as the hospital approves your account.'}</Text>
        {!!note && !rejected && <Text style={s.note}>{note}</Text>}
      </View>
      {rejected ? <Btn title="Register again" onPress={() => navigation.replace('Register')} />
        : <Btn title="Check status" icon="refresh" onPress={check} loading={busy} disabled={!phone || !password} />}
      <Btn title="Back to sign in" variant="ghost" style={{ marginTop: 14 }} onPress={() => navigation.popToTop()} />
    </AuthLayout>
  );
}
const s = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 18 }, ring: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  t: { color: C.text, textAlign: 'center', marginTop: 16, fontSize: 15, lineHeight: 22, maxWidth: 300 }, note: { color: C.mute, textAlign: 'center', marginTop: 10, fontSize: 13 },
});
