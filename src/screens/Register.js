import React, { useEffect, useState } from 'react';
import { Alert, Modal, FlatList, Pressable, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout, Field, Btn, ImageField } from '../components/ui';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

const PARTNER_HOSPITALS = [
  { id: 'hosp-1', _id: 'hosp-1', name: 'Apollo Multi-Speciality Emergency & Trauma Hospital', address: 'Jubilee Hills, Road No. 10', type: '24x7 Multi-Speciality' },
  { id: 'hosp-2', _id: 'hosp-2', name: 'Yashoda Super Specialty & Trauma Hospital', address: 'Somajiguda Raj Bhavan Rd', type: '24x7 Multi-Speciality' },
  { id: 'hosp-3', _id: 'hosp-3', name: 'CARE Multi-Speciality Emergency Hospital', address: 'Banjara Hills, Road No. 1', type: '24x7 Multi-Speciality' },
  { id: 'hosp-4', _id: 'hosp-4', name: 'KIMS Multi-Speciality Hospitals & Trauma Department', address: 'Minister Rd, Secunderabad', type: '24x7 Multi-Speciality' },
  { id: 'hosp-5', _id: 'hosp-5', name: 'Continental Multi-Speciality Emergency Hospital', address: 'Financial District, Nanakramguda', type: '24x7 Multi-Speciality' },
  { id: 'hosp-6', _id: 'hosp-6', name: 'Medicover Multi-Speciality Trauma Hospital', address: 'Cyber Towers, Madhapur', type: '24x7 Multi-Speciality' },
  { id: 'hosp-7', _id: 'hosp-7', name: 'Sunshine Multi-Speciality Emergency Hospital', address: 'PG Road, Secunderabad', type: '24x7 Multi-Speciality' },
];

export default function Register({ navigation }) {
  const { signIn } = useAuth();
  const [f, setF] = useState({ fullName: '', phone: '', password: '', licenseNumber: '', vehicleNumber: '' });
  const [img, setImg] = useState({ license: null, rc: null, photo: null });
  const [hospitals, setHospitals] = useState(PARTNER_HOSPITALS);
  const [hospital, setHospital] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const load = () => {
    api.get('/auth/hospitals')
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setHospitals(r.data);
        } else {
          setHospitals(PARTNER_HOSPITALS);
        }
      })
      .catch(() => {
        setHospitals(PARTNER_HOSPITALS);
      });
  };
  useEffect(load, []);

  const submit = async () => {
    const cleanPhone = f.phone.trim().replace(/\D/g, '').slice(-10);
    if (!f.fullName.trim() || cleanPhone.length < 10) {
      return Alert.alert('Check your details', 'Enter your full name and a valid 10-digit phone number.');
    }
    if (f.password.length < 6) {
      return Alert.alert('Weak password', 'Use at least 6 characters.');
    }
    if (!f.licenseNumber.trim() || !f.vehicleNumber.trim()) {
      return Alert.alert('Missing details', 'Enter your license number and ambulance registration number.');
    }
    if (!hospital) {
      return Alert.alert('Select a hospital', 'Choose the partner hospital that will verify your ambulance.');
    }

    const payload = {
      fullName: f.fullName.trim(),
      phone: cleanPhone,
      password: f.password,
      role: 'driver',
      ambulanceNumber: f.vehicleNumber.trim().toUpperCase(),
      licenseNumber: f.licenseNumber.trim(),
      ambulanceType: 'BASIC',
      hospital: hospital.name,
    };

    setBusy(true);
    try {
      const { data } = await api.post('/auth/driver/register', payload);
      if (data?.token) {
        await signIn(data.token, {
          id: data.user?.id || data.user?._id,
          fullName: data.user?.fullName || f.fullName.trim(),
          vehicleNumber: f.vehicleNumber.trim().toUpperCase(),
          phone: cleanPhone,
        });
      } else {
        navigation.replace('Pending', { phone: cleanPhone, password: f.password, message: 'Account Pending Verification' });
      }
    } catch (e) {
      setBusy(false);
      Alert.alert('Could not register', errMsg(e));
    }
  };

  return (
    <AuthLayout title="Driver registration" sub="Choose your partner hospital and enter ambulance details">
      <ImageField label="Profile photo" hint="Add a clear face photo (optional)" icon="person-circle-outline" round value={img.photo} onChange={(v) => setImg((p) => ({ ...p, photo: v }))} />
      <Field label="Full name" icon="person-outline" autoCapitalize="words" value={f.fullName} onChangeText={set('fullName')} placeholder="e.g. Ramesh Kumar" />
      <Field label="Phone number" icon="call-outline" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} placeholder="10-digit mobile number" />
      <Field label="Password" icon="lock-closed-outline" secureTextEntry value={f.password} onChangeText={set('password')} placeholder="At least 6 characters" />
      <Field label="Driving license number" icon="card-outline" autoCapitalize="characters" value={f.licenseNumber} onChangeText={set('licenseNumber')} placeholder="DL-1420110012345" />
      <ImageField label="Driving license image (optional)" hint="Photograph the front of your license" icon="id-card-outline" value={img.license} onChange={(v) => setImg((p) => ({ ...p, license: v }))} />
      <Field label="Ambulance registration number" icon="car-outline" autoCapitalize="characters" value={f.vehicleNumber} onChangeText={set('vehicleNumber')} placeholder="TS09AB1234" />
      <ImageField label="RC book image (optional)" hint="Photograph the RC book" icon="document-text-outline" value={img.rc} onChange={(v) => setImg((p) => ({ ...p, rc: v }))} />

      <Text style={s.label}>Hospital</Text>
      <Pressable onPress={() => setOpen(true)} style={s.pick}>
        <Ionicons name="business-outline" size={18} color={C.mute} style={{ marginRight: 10 }} />
        <Text style={{ flex: 1, fontSize: 16, color: hospital ? C.text : '#9AA6C0' }}>
          {hospital ? hospital.name : 'Select your partner hospital'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.mute} />
      </Pressable>

      <Btn title="Submit for verification" icon="shield-checkmark" onPress={submit} loading={busy} style={{ marginTop: 22 }} />
      <Btn title="I already have an account" variant="ghost" style={{ marginTop: 14 }} onPress={() => navigation.goBack()} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.back}>
          <View style={s.sheet}>
            <Text style={s.mh}>Select Partner Hospital</Text>
            <Text style={s.mSub}>Emergency trauma care requires a 24x7 Multi-Speciality hospital.</Text>
            <FlatList
              data={hospitals}
              keyExtractor={(h) => h._id || h.id}
              ListEmptyComponent={<Text style={{ color: C.mute, textAlign: 'center', padding: 20 }}>No hospitals available.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.row, hospital?._id === item._id && { borderColor: C.blue, backgroundColor: C.soft }]}
                  onPress={() => { setHospital(item); setOpen(false); }}
                >
                  <Ionicons name="medical" size={22} color={C.blue} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={s.rn}>{item.name}</Text>
                    {!!item.address && <Text style={s.ra}>{item.address}</Text>}
                    <View style={s.specBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={C.ok} />
                      <Text style={s.specText}>24x7 Multi-Speciality Trauma Care</Text>
                    </View>
                  </View>
                </Pressable>
              )}
            />
            <Btn title="Close" variant="ghost" onPress={() => setOpen(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: C.mute, marginBottom: 6 },
  pick: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 54 },
  back: { flex: 1, backgroundColor: 'rgba(5,12,30,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '75%' },
  mh: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 },
  mSub: { fontSize: 13, color: C.mute, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, marginBottom: 8 },
  rn: { fontWeight: '700', fontSize: 15, color: C.text },
  ra: { color: C.mute, fontSize: 12.5, marginTop: 2 },
  specBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E5F6EC', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  specText: { color: C.ok, fontSize: 11, fontWeight: '700', marginLeft: 4 },
});
