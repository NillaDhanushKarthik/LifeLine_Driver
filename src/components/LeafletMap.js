import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAPTILER_KEY } from '../config';
import { LEAFLET_CSS, LEAFLET_JS } from './leafletBundle';

const LeafletMap = forwardRef(function LeafletMap(
  {
    initialRegion = { latitude: 17.385, longitude: 78.4867, zoom: 14 },
    driverLocation,
    pickupLocation,
    hospitalLocation,
    route,
    online = false,
    activeTrip = false,
    style,
  },
  ref
) {
  const webViewRef = useRef(null);
  const isReadyRef = useRef(false);
  const [, setIsReady] = useState(false);

  const currentPayload = useMemo(() => ({
    driver: driverLocation ? { lat: driverLocation.latitude, lng: driverLocation.longitude, heading: driverLocation.heading || 0 } : null,
    pickup: pickupLocation ? { lat: pickupLocation.latitude, lng: pickupLocation.longitude } : null,
    hospital: hospitalLocation ? { lat: hospitalLocation.latitude, lng: hospitalLocation.longitude } : null,
    route: route?.coords ? route.coords.map((c) => [c.latitude, c.longitude]) : null,
    online: !!online,
    active: !!activeTrip,
  }), [
    driverLocation?.latitude,
    driverLocation?.longitude,
    driverLocation?.heading,
    pickupLocation?.latitude,
    pickupLocation?.longitude,
    hospitalLocation?.latitude,
    hospitalLocation?.longitude,
    route?.coords?.length,
    online,
    activeTrip,
  ]);

  const payloadRef = useRef(currentPayload);
  payloadRef.current = currentPayload;

  const sendToMap = useCallback((msgObj) => {
    if (webViewRef.current) {
      try {
        webViewRef.current.postMessage(JSON.stringify(msgObj));
      } catch {}
    }
  }, []);

  useImperativeHandle(ref, () => ({
    animateCamera: ({ center, zoom = 15 }) => {
      if (center) {
        sendToMap({
          type: 'PAN_TO',
          payload: { lat: center.latitude || center.lat, lng: center.longitude || center.lng, zoom },
        });
      }
    },
    animateToRegion: ({ latitude, longitude, zoom = 15 }) => {
      sendToMap({
        type: 'PAN_TO',
        payload: { lat: latitude, lng: longitude, zoom },
      });
    },
    fitToCoordinates: (coords, options = {}) => {
      if (coords && coords.length > 0) {
        sendToMap({
          type: 'FIT_BOUNDS',
          payload: { coords, padding: options.edgePadding || { top: 120, bottom: 300, left: 50, right: 50 } },
        });
      }
    },
    invalidateSize: () => {
      sendToMap({ type: 'INVALIDATE_SIZE' });
    },
  }));

  useEffect(() => {
    if (isReadyRef.current) {
      sendToMap({
        type: 'UPDATE',
        payload: currentPayload,
      });
    }
  }, [currentPayload, sendToMap]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        isReadyRef.current = true;
        setIsReady(true);
        if (payloadRef.current) {
          sendToMap({
            type: 'UPDATE',
            payload: payloadRef.current,
          });
        }
        if (payloadRef.current?.driver) {
          sendToMap({
            type: 'PAN_TO',
            payload: { lat: payloadRef.current.driver.lat, lng: payloadRef.current.driver.lng, zoom: 15 },
          });
        }
      }
    } catch {}
  }, [sendToMap]);

  const initLat = Number(initialRegion?.latitude) || 17.385;
  const initLng = Number(initialRegion?.longitude) || 78.4867;
  const initZoom = Number(initialRegion?.zoom) || 14;

  const htmlContent = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    ${LEAFLET_CSS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #0c192c;
    }
    #map {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100%;
      background-color: #0c192c;
    }
    .leaflet-control-attribution { font-size: 10px; background: rgba(0,0,0,0.5) !important; color: #aaa !important; padding: 2px 6px; }
    .leaflet-control-attribution a { color: #80b3ff !important; }

    /* Ambulance / Driver Pin */
    .ambulance-marker {
      width: 48px;
      height: 48px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ambulance-pin {
      width: 42px;
      height: 42px;
      background: #E5252A;
      border: 3px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(229, 37, 42, 0.6);
      z-index: 3;
    }
    .ambulance-radar {
      position: absolute;
      width: 60px;
      height: 60px;
      background: rgba(229, 37, 42, 0.3);
      border-radius: 50%;
      animation: radarPulse 2s ease-out infinite;
      z-index: 1;
    }
    @keyframes radarPulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    /* Pickup & Hospital Pins */
    .custom-pin {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .pin-pickup { background: #0B2A6F; }
    .pin-hospital { background: #1565FF; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    ${LEAFLET_JS}
  </script>

  <script>
    var apiKey = "${MAPTILER_KEY || ''}";
    var initLat = ${initLat};
    var initLng = ${initLng};
    var initZoom = ${initZoom};

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([initLat, initLng], initZoom);

    // Primary: MapTiler Streets v2 or CartoDB Voyager
    var primaryLayer;
    if (apiKey && apiKey.length > 5) {
      primaryLayer = L.tileLayer('https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=' + apiKey, {
        maxZoom: 19,
        tileSize: 256,
        attribution: '&copy; MapTiler &copy; OSM'
      }).addTo(map);
    } else {
      primaryLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd'],
        attribution: '&copy; CartoDB &copy; OSM'
      }).addTo(map);
    }

    // Fallbacks: CartoDB & OpenStreetMap
    var fallbackCarto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '&copy; CartoDB &copy; OSM'
    });
    var fallbackOsm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    });

    primaryLayer.on('tileerror', function() {
      if (!map.hasLayer(fallbackCarto) && !map.hasLayer(fallbackOsm)) {
        fallbackCarto.addTo(map);
      }
    });
    fallbackCarto.on('tileerror', function() {
      if (!map.hasLayer(fallbackOsm)) {
        fallbackOsm.addTo(map);
      }
    });

    function fixSize() {
      if (map) map.invalidateSize();
    }
    window.addEventListener('resize', fixSize);
    setTimeout(fixSize, 100);
    setTimeout(fixSize, 400);
    setTimeout(fixSize, 1200);

    var driverMarker = null;
    var pickupMarker = null;
    var hospitalMarker = null;
    var routeLine = null;
    var routeBgLine = null;

    function createAmbulanceIcon(isOnline) {
      var radarHtml = isOnline ? '<div class="ambulance-radar"></div>' : '';
      var svg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19 8h-2.5V5.5c0-.83-.67-1.5-1.5-1.5H9c-.83 0-1.5.67-1.5 1.5V8H5c-1.1 0-2 .9-2 2v9c0 .55.45 1 1 1h1.18c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2h4.36c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2H20c.55 0 1-.45 1-1v-6.68c0-.68-.28-1.34-.78-1.81L19 8zm-8 4H9v-2h2V8h2v2h2v2h-2v2h-2v-2z"/></svg>';
      return L.divIcon({
        className: '',
        html: '<div class="ambulance-marker">' + radarHtml + '<div class="ambulance-pin">' + svg + '</div></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
    }

    function createPinIcon(type) {
      var bg = type === 'hospital' ? 'pin-hospital' : 'pin-pickup';
      var svg = type === 'hospital'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      return L.divIcon({
        className: '',
        html: '<div class="custom-pin ' + bg + '">' + svg + '</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
    }

    function handleUpdate(p) {
      if (!p) return;

      // 1. Driver Marker
      if (p.driver) {
        if (!driverMarker) {
          driverMarker = L.marker([p.driver.lat, p.driver.lng], {
            icon: createAmbulanceIcon(p.online),
            zIndexOffset: 1000
          }).addTo(map);
        } else {
          driverMarker.setLatLng([p.driver.lat, p.driver.lng]);
          driverMarker.setIcon(createAmbulanceIcon(p.online));
        }
      } else if (driverMarker) {
        map.removeLayer(driverMarker);
        driverMarker = null;
      }

      // 2. Pickup Marker
      if (p.pickup) {
        if (!pickupMarker) {
          pickupMarker = L.marker([p.pickup.lat, p.pickup.lng], { icon: createPinIcon('pickup') }).addTo(map);
        } else {
          pickupMarker.setLatLng([p.pickup.lat, p.pickup.lng]);
        }
      } else if (pickupMarker) {
        map.removeLayer(pickupMarker);
        pickupMarker = null;
      }

      // 3. Hospital Marker
      if (p.hospital) {
        if (!hospitalMarker) {
          hospitalMarker = L.marker([p.hospital.lat, p.hospital.lng], { icon: createPinIcon('hospital') }).addTo(map);
        } else {
          hospitalMarker.setLatLng([p.hospital.lat, p.hospital.lng]);
        }
      } else if (hospitalMarker) {
        map.removeLayer(hospitalMarker);
        hospitalMarker = null;
      }

      // 4. Route Polyline
      if (p.route && p.route.length > 0) {
        if (!routeBgLine) {
          routeBgLine = L.polyline(p.route, { color: '#0B2A6F', weight: 8, opacity: 0.4 }).addTo(map);
          routeLine = L.polyline(p.route, { color: '#4D8DFF', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        } else {
          routeBgLine.setLatLngs(p.route);
          routeLine.setLatLngs(p.route);
        }
      } else {
        if (routeBgLine) { map.removeLayer(routeBgLine); routeBgLine = null; }
        if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
      }

      // Auto fit bounds when on a trip with multiple points
      var activePoints = [];
      if (p.driver) activePoints.push([p.driver.lat, p.driver.lng]);
      if (p.pickup) activePoints.push([p.pickup.lat, p.pickup.lng]);
      if (p.hospital) activePoints.push([p.hospital.lat, p.hospital.lng]);

      if (activePoints.length > 1) {
        map.fitBounds(L.latLngBounds(activePoints), {
          paddingTopLeft: [50, 120],
          paddingBottomRight: [50, 360],
          maxZoom: 16,
          animate: true
        });
      }
    }

    function onMessage(event) {
      try {
        var msg = event.data;
        if (typeof msg === 'string') {
          msg = JSON.parse(msg);
        }
        if (!msg || !msg.type) return;

        if (msg.type === 'UPDATE') {
          handleUpdate(msg.payload);
        } else if (msg.type === 'PAN_TO') {
          map.setView([msg.payload.lat, msg.payload.lng], msg.payload.zoom || 15, { animate: true });
        } else if (msg.type === 'FIT_BOUNDS') {
          var coords = msg.payload.coords.map(function(c) { return [c.latitude || c.lat, c.longitude || c.lng]; });
          var pad = msg.payload.padding || {};
          map.fitBounds(L.latLngBounds(coords), {
            paddingTopLeft: [pad.left || 40, pad.top || 60],
            paddingBottomRight: [pad.right || 40, pad.bottom || 240],
            animate: true
          });
        } else if (msg.type === 'INVALIDATE_SIZE') {
          fixSize();
        }
      } catch {}
    }

    window.addEventListener('message', onMessage);
    document.addEventListener('message', onMessage);

    setTimeout(function() {
      fixSize();
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 50);
  </script>
</body>
</html>`, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://api.maptiler.com' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        androidLayerType="hardware"
        androidHardwareAccelerationDisabled={false}
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
        onLoadEnd={() => {
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({ type: 'INVALIDATE_SIZE' }));
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#0c192c',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c192c',
    opacity: 0.99,
  },
});

export default LeafletMap;
