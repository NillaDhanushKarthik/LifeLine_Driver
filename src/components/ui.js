import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../theme';

const V = { primary: { bg: C.blue, fg: '#fff' }, danger: { bg: C.red, fg: '#fff' }, ok: { bg: C.ok, fg: '#fff' }, ghost: { bg: C.soft, fg: C.blue }, outline: { bg: '#fff', fg: C.red, bd: C.red } };
export function Btn({ title, onPress, variant = 'primary', loading, icon, style, disabled, big }) {
  const v = V[variant];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [s.btn, big && { height: 68, borderRadius: 22 }, { backgroundColor: v.bg, borderColor: v.bd || v.bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (<>
        {icon && <Ionicons name={icon} size={big ? 26 : 20} color={v.fg} style={{ marginRight: 8 }} />}
        <Text style={[s.bt, big && { fontSize: 19 }, { color: v.fg }]}>{title}</Text></>)}
    </Pressable>
  );
}

export function Field({ label, icon, ...p }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        {icon && <Ionicons name={icon} size={18} color={C.mute} style={{ marginRight: 10 }} />}
        <TextInput placeholderTextColor="#9AA6C0" style={s.input} autoCapitalize="none" {...p} />
      </View>
    </View>
  );
}

export function AuthLayout({ title, sub, children }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.navy }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={s.mast}>
          <View style={s.logo}><Ionicons name="medical" size={30} color={C.red} /></View>
          <Text style={s.brand}>LifeLine Driver</Text>
          <Text style={s.tag}>Every second counts</Text>
        </View>
        <View style={s.sheet}>
          <Text style={s.h1}>{title}</Text>
          {!!sub && <Text style={s.sub}>{sub}</Text>}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Camera / gallery picker. Emits {uri,name,type} ready for FormData. JPEG only (backend accepts jpeg/png/webp, max 5 MB). */
export function ImageField({ label, hint, value, onChange, icon = 'camera-outline', round }) {
  const pick = async (camera) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow access in Settings to continue.');
    const r = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
    if (r.canceled) return;
    const a = r.assets[0];
    if (a.fileSize && a.fileSize > 5 * 1024 * 1024) return Alert.alert('Image too large', 'Please use an image under 5 MB.');
    onChange({ uri: a.uri, name: `${label.replace(/\W+/g, '').toLowerCase()}.jpg`, type: 'image/jpeg' });
  };
  const choose = () => Alert.alert(label, undefined, [{ text: 'Take photo', onPress: () => pick(true) }, { text: 'Choose from gallery', onPress: () => pick(false) }, { text: 'Cancel', style: 'cancel' }]);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={choose} style={[s.img, round && { width: 110, height: 110, borderRadius: 55 }]}>
        {value ? <Image source={{ uri: value.uri }} style={{ width: '100%', height: '100%' }} />
          : (<View style={{ alignItems: 'center' }}><Ionicons name={icon} size={28} color={C.blue} /><Text style={s.imgT}>{hint || 'Tap to add'}</Text></View>)}
      </Pressable>
      {value && <Pressable onPress={choose}><Text style={{ color: C.blue, fontWeight: '600', marginTop: 6 }}>Change photo</Text></Pressable>}
    </View>
  );
}

export const Chip = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.blue, borderColor: C.blue }]}>
    <Text style={[s.chipT, active && { color: '#fff' }]}>{label}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  btn: { height: 56, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  bt: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '600', color: C.mute, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 54 },
  input: { flex: 1, fontSize: 16, color: C.text },
  mast: { alignItems: 'center', paddingTop: 64, paddingBottom: 30 },
  logo: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 12 }, tag: { color: '#AFC4F5', fontSize: 14, marginTop: 2 },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 28, minHeight: 440 },
  h1: { fontSize: 24, fontWeight: '800', color: C.text }, sub: { color: C.mute, marginTop: 4, marginBottom: 18, fontSize: 14 },
  img: { height: 150, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9DB8F5', backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgT: { color: C.blue, fontWeight: '600', marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  chipT: { color: C.text, fontWeight: '600', fontSize: 14 },
});
