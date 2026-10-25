// Bottom sheet that walks the driver through the trip status machine:
// ACCEPTED -> DRIVER_ARRIVING -> ARRIVED -> PATIENT PICKED -> TRIP_STARTED -> COMPLETED
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from './ui';
import { useDriver } from '../DriverContext';
import { errMsg } from '../api';
import { mapsLink } from '../util';
import { C, shadow } from '../theme';

const STEPS = ['Pickup', 'Patient', 'Hospital', 'Done'];

const getStepIdx = (status) => {
  const s = (status || '').toUpperCase().replace(/\s+/g, '_');
  if (['ACCEPTED', 'DRIVER_ARRIVING'].includes(s)) return 0;
  if (['ARRIVED'].includes(s)) return 1;
  if (['PATIENT_PICKED', 'HOSPITAL_SELECTED', 'HOSPITAL_NOTIFIED', 'TRIP_STARTED'].includes(s)) return 2;
  if (['COMPLETED'].includes(s)) return 3;
  return 0;
};

const getHeaderCopy = (status, targetLabel) => {
  const s = (status || '').toUpperCase().replace(/\s+/g, '_');
  switch (s) {
    case 'ACCEPTED':
      return ['Request Accepted', 'Start driving to the patient pickup location'];
    case 'DRIVER_ARRIVING':
      return ['Heading to Patient', targetLabel || 'Navigating to pickup address'];
    case 'ARRIVED':
      return ['Arrived at Pickup Location', 'Confirm when patient is loaded in ambulance'];
    case 'PATIENT_PICKED':
    case 'HOSPITAL_NOTIFIED':
    case 'TRIP_STARTED':
      return ['En Route to Hospital', targetLabel || 'Taking patient to emergency hospital'];
    case 'COMPLETED':
      return ['Trip Completed', 'Patient successfully handed over'];
    default:
      return ['Trip in Progress', targetLabel || ''];
  }
};

export default function TripPanel({ target, targetLabel, etaMin, distKm }) {
  const { trip, advance, loadHospitals, chooseHospital, clearTripLocal } = useDriver();
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  const st = trip?.status || '';
  const norm = st.toUpperCase().replace(/\s+/g, '_');
  const stepIdx = getStepIdx(norm);
  const copy = getHeaderCopy(norm, targetLabel);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Action failed', errMsg(e));
    }
    if (alive.current) setBusy(false);
  };

  const fetchHospitals = () => {
    setErr(null);
    setList(null);
    loadHospitals()
      .then((l) => {
        if (!alive.current) return;
        setList(l);
        setSel(l[0]?.id || l[0]?._id || null);
        if (!l.length) setErr('No hospitals found nearby.');
      })
      .catch((e) => alive.current && setErr(errMsg(e)));
  };

  useEffect(() => {
    if (norm === 'ARRIVED') {
      fetchHospitals();
    }
  }, [norm]);

  const nav = target && (
    <Btn
      title="Open in Google Maps"
      icon="navigate"
      variant="ghost"
      onPress={() => Linking.openURL(mapsLink(target))}
      style={{ height: 50, marginTop: 10 }}
    />
  );

  const complete = () =>
    Alert.alert(
      'Complete Trip?',
      'Confirm the patient has safely arrived and been handed over at the hospital.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Complete', onPress: () => run(() => advance('COMPLETED')) },
      ]
    );

  const clear = () =>
    Alert.alert(
      'Clear this trip?',
      'Use this only if the request was cancelled or is already finished.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Clear trip', style: 'destructive', onPress: clearTripLocal },
      ]
    );

  return (
    <View style={[s.sheet, shadow]}>
      <View style={s.grab} />
      <View style={s.steps}>
        {STEPS.map((l, i) => (
          <View key={l} style={{ flex: 1 }}>
            <View style={[s.bar, i <= stepIdx && { backgroundColor: C.blue }]} />
            <Text style={[s.stepT, i === stepIdx && { color: C.blue, fontWeight: '700' }]}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={s.title}>{copy[0]}</Text>
      <Text style={s.sub} numberOfLines={1}>{copy[1]}</Text>

      {norm !== 'ARRIVED' && (
        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.v}>{etaMin ?? '–'}<Text style={s.u}> min</Text></Text>
            <Text style={s.l}>ETA</Text>
          </View>
          <View style={s.sep} />
          <View style={s.stat}>
            <Text style={s.v}>{distKm != null ? distKm.toFixed(1) : '–'}<Text style={s.u}> km</Text></Text>
            <Text style={s.l}>Distance</Text>
          </View>
        </View>
      )}

      {/* State 1: Accepted -> Start driving */}
      {norm === 'ACCEPTED' && (
        <Btn
          big
          icon="play"
          title="Start Driving to Patient"
          onPress={() => run(() => advance('DRIVER_ARRIVING'))}
          loading={busy}
          style={{ marginTop: 14 }}
        />
      )}

      {/* State 2: Driver Arriving -> Arrived at pickup */}
      {norm === 'DRIVER_ARRIVING' && (
        <>
          {nav}
          <Btn
            big
            icon="flag"
            title="I Have Arrived at Pickup"
            onPress={() => run(() => advance('ARRIVED'))}
            loading={busy}
            style={{ marginTop: 12 }}
          />
        </>
      )}

      {/* State 3: Arrived -> Patient Picked Up Button */}
      {norm === 'ARRIVED' && (
        <View style={{ marginTop: 14 }}>
          {!showPicker ? (
            <>
              <Btn
                big
                variant="ok"
                icon="person-add"
                title="PATIENT PICKED UP"
                onPress={() => setShowPicker(true)}
                loading={busy}
              />
              <Btn
                variant="ghost"
                title="Directly start trip to nearest multi-speciality hospital"
                onPress={() => run(() => chooseHospital(undefined))}
                style={{ marginTop: 10, height: 46 }}
              />
            </>
          ) : (
            <View>
              <View style={s.multiBadgeBanner}>
                <Ionicons name="shield-checkmark" size={14} color={C.ok} />
                <Text style={s.multiBadgeText}>Verified Emergency-Attending Hospitals Only</Text>
              </View>
              <Text style={s.hPickH}>Select Destination Hospital:</Text>
              <Text style={s.hPickSub}>Only hospitals with an active 24/7 Casualty & Trauma Bay that attend acute emergency admissions are listed.</Text>
              {!list && !err && <ActivityIndicator color={C.blue} style={{ marginVertical: 14 }} />}
              {err && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: C.red, textAlign: 'center' }}>{err}</Text>
                  <Btn title="Retry" variant="ghost" onPress={fetchHospitals} style={{ marginTop: 8, height: 44 }} />
                </View>
              )}
              {list?.map((h, i) => {
                const hId = h.id || h._id;
                const isSelected = sel === hId;
                const hPhone = h.emergencyPhone || '108';
                return (
                  <Pressable key={hId} onPress={() => setSel(hId)} style={[s.hosp, isSelected && s.hospOn]}>
                    <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={22} color={isSelected ? C.blue : C.mute} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.hName}>{h.name}</Text>
                      <View style={s.attendingBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={C.ok} />
                        <Text style={s.attendingText}>Attends Emergency Cases · 24/7 ER Active</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={s.hSub}>
                          {h.distanceKm != null ? `${h.distanceKm.toFixed(1)} km` : ''}
                          {h.etaMinutes != null ? ` · ~${h.etaMinutes} min` : ''}
                          {i === 0 ? ' · Nearest' : ''}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => Linking.openURL(`tel:${hPhone}`)}
                          style={s.miniCallBtn}
                        >
                          <Ionicons name="call" size={11} color={C.blue} />
                          <Text style={s.miniCallText}>Pre-Alert ER</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
              <Btn
                big
                variant="primary"
                icon="navigate"
                title="Start Trip to Emergency Hospital"
                onPress={() => {
                  const selectedObj = list?.find((h) => (h.id || h._id) === sel);
                  run(() => chooseHospital(sel, selectedObj));
                }}
                loading={busy}
                disabled={!sel}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </View>
      )}

      {/* State 4: En route to hospital -> Complete Trip */}
      {(norm === 'TRIP_STARTED' || norm === 'HOSPITAL_NOTIFIED' || norm === 'PATIENT_PICKED') && (
        <>
          {nav}
          <Btn
            title={`Pre-Alert Hospital Casualty (${trip?.hospital?.emergencyPhone || '108'})`}
            icon="call"
            variant="outline"
            onPress={() => Linking.openURL(`tel:${trip?.hospital?.emergencyPhone || '108'}`)}
            style={{ height: 48, marginTop: 10, borderColor: C.blue }}
          />
          <Btn
            big
            variant="ok"
            icon="checkmark-done"
            title="COMPLETE TRIP (PATIENT HANDOVER)"
            onPress={complete}
            loading={busy}
            style={{ marginTop: 12 }}
          />
        </>
      )}

      <Pressable onPress={clear} style={{ alignSelf: 'center', marginTop: 14 }}>
        <Text style={{ color: C.mute, fontSize: 12 }}>Trip not active? Clear it</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 26 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 14 },
  steps: { flexDirection: 'row', marginBottom: 14 },
  bar: { height: 5, borderRadius: 3, backgroundColor: C.line, marginRight: 4 },
  stepT: { fontSize: 10.5, color: C.mute, marginTop: 5 },
  title: { fontSize: 21, fontWeight: '900', color: C.text },
  sub: { color: C.mute, marginTop: 3, fontSize: 14 },
  stats: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 18, paddingVertical: 14, marginTop: 14 },
  stat: { flex: 1, alignItems: 'center' },
  sep: { width: 1, backgroundColor: C.line },
  v: { fontSize: 26, fontWeight: '800', color: C.navy },
  u: { fontSize: 14, fontWeight: '600', color: C.mute },
  l: { fontSize: 12, color: C.mute, marginTop: 2 },
  hPickH: { fontSize: 16, fontWeight: '800', color: C.navy, marginBottom: 2 },
  hPickSub: { fontSize: 12, color: C.mute, marginBottom: 12, lineHeight: 16 },
  multiBadgeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 10, alignSelf: 'flex-start' },
  multiBadgeText: { fontSize: 12, fontWeight: '700', color: C.ok, marginLeft: 6 },
  attendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginVertical: 3 },
  attendingText: { fontSize: 11, fontWeight: '700', color: C.ok, marginLeft: 4 },
  miniCallBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF4FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#D0E1FD' },
  miniCallText: { fontSize: 11, fontWeight: '700', color: C.blue, marginLeft: 4 },
  hosp: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, marginBottom: 8 },
  hospOn: { borderColor: C.blue, backgroundColor: C.soft },
  hName: { fontWeight: '700', fontSize: 15, color: C.text },
  hSub: { color: C.mute, fontSize: 12.5, marginTop: 1 },
});
