import React, { useState } from 'react';
import { Alert, Text, Pressable } from 'react-native';
import { AuthLayout, Field, Btn } from '../components/ui';
import api, { errMsg } from '../api'; import { useAuth } from '../AuthContext'; import { C } from '../theme';

export default function Login({ navigation }) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    if (!phone.trim() || !password) return Alert.alert('Missing details', 'Enter your phone number and password.');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/driver/login', { phone: phone.trim(), password });
      await signIn(data.token, { ...data.driver, phone: phone.trim() });
    } catch (e) {
      setBusy(false); const m = errMsg(e);
      if (e?.response?.status === 403) navigation.navigate('Pending', { phone: phone.trim(), password, message: m });   // pending or rejected
      else Alert.alert('Login failed', m);
    }
  };
  return (
    <AuthLayout title="Driver sign in" sub="Sign in to start receiving emergencies">
      <Field label="Phone number" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="98765 43210" />
      <Field label="Password" icon="lock-closed-outline" secureTextEntry value={password} onChangeText={setPassword} placeholder="Your password" />
      <Pressable onPress={() => navigation.navigate('Forgot')} style={{ alignSelf: 'flex-end', marginBottom: 18 }}><Text style={{ color: C.blue, fontWeight: '600' }}>Forgot password?</Text></Pressable>
      <Btn title="Sign in" onPress={go} loading={busy} />
      <Btn title="Register as a driver" variant="ghost" style={{ marginTop: 14 }} onPress={() => navigation.navigate('Register')} />
    </AuthLayout>
  );
}
