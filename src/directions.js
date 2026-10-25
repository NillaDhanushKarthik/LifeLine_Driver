// Google Directions API: real road route + traffic-aware ETA. Returns null when no key / no route.
import { GOOGLE_KEY } from './config';
const decode = (t) => { let i = 0, la = 0, ln = 0; const out = [];
  while (i < t.length) { let b, s = 0, r = 0;
    do { b = t.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32); la += r & 1 ? ~(r >> 1) : r >> 1;
    s = 0; r = 0;
    do { b = t.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32); ln += r & 1 ? ~(r >> 1) : r >> 1;
    out.push({ latitude: la / 1e5, longitude: ln / 1e5 }); }
  return out; };
export async function getRoute(o, d) {
  if (GOOGLE_KEY) {
    try {
      const u = `https://maps.googleapis.com/maps/api/directions/json?origin=${o.latitude},${o.longitude}&destination=${d.latitude},${d.longitude}&mode=driving&departure_time=now&key=${GOOGLE_KEY}`;
      const j = await (await fetch(u)).json();
      const leg = j.routes?.[0]?.legs?.[0];
      if (leg) {
        return {
          coords: decode(j.routes[0].overview_polyline.points),
          distanceKm: leg.distance.value / 1000,
          etaMin: Math.max(1, Math.round((leg.duration_in_traffic || leg.duration).value / 60))
        };
      }
    } catch {}
  }

  // Free OpenStreetMap / OSRM routing (no API key required)
  try {
    const u = `https://router.project-osrm.org/route/v1/driving/${o.longitude},${o.latitude};${d.longitude},${d.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(u);
    const j = await res.json();
    if (j.code === 'Ok' && j.routes?.[0]) {
      const r = j.routes[0];
      const coords = r.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
      return {
        coords,
        distanceKm: Math.round((r.distance / 1000) * 10) / 10,
        etaMin: Math.max(1, Math.round(r.duration / 60))
      };
    }
  } catch {}

  return null;
}

