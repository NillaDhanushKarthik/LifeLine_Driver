import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout, Btn } from '../components/ui';
import { C } from '../theme';

// The backend exposes forgot/reset password for requester accounts only (POST /auth/forgot-password targets the User model),
// so a driver reset cannot be performed from the app. This screen says so honestly instead of calling the wrong endpoint.
export default function Forgot({ navigation }) {
  return (
    <AuthLayout title="Forgot password" sub="Password reset is not available for driver accounts yet">
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="key-outline" size={34} color={C.blue} /></View>
        <Text style={{ color: C.mute, textAlign: 'center', marginTop: 16, lineHeight: 21, maxWidth: 300 }}>
          Please contact LifeLine support to recover access to your driver account.</Text>
      </View>
      <Btn title="Back to sign in" onPress={() => navigation.goBack()} />
    </AuthLayout>
  );
}
