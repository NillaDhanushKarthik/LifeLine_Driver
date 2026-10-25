export const toLL = (c) => (c ? { latitude: c[1], longitude: c[0] } : null);   // backend GeoJSON [lng,lat] -> map
const rad = (d) => (d * Math.PI) / 180;
export function distanceKm(a, b) {                                              // a,b = {latitude,longitude}
  const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}
export const etaMinutes = (km, kmh = 40) => Math.max(1, Math.round((km / kmh) * 60));
export const fmtDate = (d) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const mapsLink = (ll) => `https://www.google.com/maps/dir/?api=1&destination=${ll.latitude},${ll.longitude}&travelmode=driving`;
