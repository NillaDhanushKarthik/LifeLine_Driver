import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../api'; import { Chip } from '../components/ui'; import { C, shadow } from '../theme'; import { fmtDate } from '../util';

const cache = {};   // pickup area names (device geocoder, best effort)
function Place({ coords }) {
  const key = coords.join(','); const [name, setName] = useState(cache[key]);
  useEffect(() => {
    if (cache[key]) return; let on = true;
    Location.reverseGeocodeAsync({ latitude: coords[1], longitude: coords[0] }).then((r) => {
      const a = r?.[0]; const t = a ? [a.name !== a.street ? a.name : null, a.street, a.district || a.city].filter(Boolean).join(', ') : null;
      if (on && t) { cache[key] = t; setName(t); }
    }).catch(() => {});
    return () => { on = false; };
  }, [key]);
  return <Text style={s.who} numberOfLines={1}>{name || `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`}</Text>;
}
const mins = (b) => (b.acceptedAt && b.completedAt ? Math.max(1, Math.round((new Date(b.completedAt) - new Date(b.acceptedAt)) / 60000)) : null);

export default function History() {
  const [items, setItems] = useState(null), [ref, setRef] = useState(false), [err, setErr] = useState(false), [f, setF] = useState('Completed');
  const load = useCallback(async () => { try { setItems((await api.get('/driver/history')).data); setErr(false); } catch { setErr(true); setItems((p) => p || []); } }, []);
  useEffect(() => { load(); }, []);
  const shown = useMemo(() => (items || []).filter((b) => f === 'All' || b.status === f), [items, f]);
  const done = (items || []).filter((b) => b.status === 'Completed').length;

  return (
    <FlatList style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, flexGrow: 1 }} data={shown} keyExtractor={(b) => b._id}
      refreshControl={<RefreshControl refreshing={ref} onRefresh={async () => { setRef(true); await load(); setRef(false); }} />}
      ListHeaderComponent={<View style={{ marginBottom: 6 }}>
        <View style={s.hero}><Text style={s.heroV}>{done}</Text><Text style={s.heroL}>trips completed</Text></View>
        <View style={{ flexDirection: 'row', marginTop: 14, marginBottom: 6 }}>{['Completed', 'Cancelled', 'All'].map((x) => <Chip key={x} label={x} active={f === x} onPress={() => setF(x)} />)}</View></View>}
      ListEmptyComponent={items && <View style={s.empty}><Ionicons name={err ? 'cloud-offline-outline' : 'document-text-outline'} size={44} color={C.mute} />
        <Text style={s.emptyT}>{err ? 'Could not load trips. Pull down to retry.' : 'No trips here yet.'}</Text></View>}
      renderItem={({ item: b }) => { const ok = b.status === 'Completed'; const m = mins(b); return (
        <View style={[s.card, shadow]}>
          <View style={[s.icon, { backgroundColor: (ok ? C.ok : C.mute) + '22' }]}><Ionicons name={ok ? 'checkmark-done' : 'close'} size={20} color={ok ? C.ok : C.mute} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.when}>{fmtDate(b.completedAt || b.createdAt)}</Text>
            <Place coords={b.pickup.coordinates} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[s.pill, { backgroundColor: (ok ? C.ok : C.mute) + '22' }]}><Text style={[s.pillT, { color: ok ? C.ok : C.mute }]}>{b.status}</Text></View>
            {ok && m != null && <Text style={s.dur}>{m} min</Text>}
          </View>
        </View>); }} />
  );
}
const s = StyleSheet.create({
  hero: { backgroundColor: C.navy, borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'baseline' }, heroV: { color: '#fff', fontSize: 44, fontWeight: '900' }, heroL: { color: '#AFC4F5', fontSize: 16, marginLeft: 10, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  when: { fontWeight: '700', color: C.text, fontSize: 15 }, who: { color: C.mute, fontSize: 13, marginTop: 3, maxWidth: 190 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }, pillT: { fontSize: 12, fontWeight: '700' }, dur: { color: C.mute, fontSize: 12, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }, emptyT: { color: C.mute, marginTop: 12, textAlign: 'center', maxWidth: 240 },
});
