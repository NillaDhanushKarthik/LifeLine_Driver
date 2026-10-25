import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { addSirenListener } from '../siren';

const SIREN_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
</head>
<body style="background:transparent;margin:0;padding:0;">
<script>
  var audioCtx = null;
  var osc1 = null;
  var osc2 = null;
  var gainNode = null;
  var isPlaying = false;
  var sirenTimer = null;

  function initAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function startSiren() {
    initAudio();
    if (isPlaying || !audioCtx) return;
    isPlaying = true;

    try {
      osc1 = audioCtx.createOscillator();
      osc2 = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();

      // Piercing sawtooth wave cuts through background noise on phone speakers
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      // Boost volume significantly (2.0 = 200% loud)
      gainNode.gain.setValueAtTime(2.0, audioCtx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      var now = audioCtx.currentTime;
      osc1.start(now);
      osc2.start(now);

      // European/American Hi-Lo emergency ambulance siren (960Hz / 770Hz)
      var highFreq = 960;
      var lowFreq = 770;
      var isHigh = true;

      sirenTimer = setInterval(function() {
        if (!isPlaying || !audioCtx || !osc1) return;
        isHigh = !isHigh;
        var freq = isHigh ? highFreq : lowFreq;
        var t = audioCtx.currentTime;
        if (osc1.frequency) {
          osc1.frequency.setValueAtTime(freq, t);
        }
        if (osc2.frequency) {
          osc2.frequency.setValueAtTime(freq * 0.5, t);
        }
      }, 420);
    } catch (err) {}
  }

  function stopSiren() {
    isPlaying = false;
    if (sirenTimer) {
      clearInterval(sirenTimer);
      sirenTimer = null;
    }
    if (osc1) {
      try { osc1.stop(); osc1.disconnect(); } catch (e) {}
      osc1 = null;
    }
    if (osc2) {
      try { osc2.stop(); osc2.disconnect(); } catch (e) {}
      osc2 = null;
    }
  }

  function onMsg(e) {
    var d = e.data;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch (err) {}
    }
    var action = (typeof d === 'object' && d && d.action) ? d.action : d;
    if (action === 'START') {
      startSiren();
    } else if (action === 'STOP') {
      stopSiren();
    }
  }

  window.addEventListener('message', onMsg);
  document.addEventListener('message', onMsg);

  // Notify parent component that player is ready
  setTimeout(function() {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
    }
  }, 100);
</script>
</body>
</html>`;

export default function SirenPlayer() {
  const webViewRef = useRef(null);
  const isReadyRef = useRef(false);
  const isPlayingRef = useRef(false);

  const sendAction = useCallback((action) => {
    if (webViewRef.current && isReadyRef.current) {
      try {
        webViewRef.current.postMessage(JSON.stringify({ action }));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const unsubscribe = addSirenListener((playing) => {
      isPlayingRef.current = playing;
      sendAction(playing ? 'START' : 'STOP');
    });
    return unsubscribe;
  }, [sendAction]);

  const handleMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'READY') {
        isReadyRef.current = true;
        if (isPlayingRef.current) {
          sendAction('START');
        }
      }
    } catch {}
  };

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: SIREN_HTML }}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 2,
    height: 2,
    opacity: 0.01,
    overflow: 'hidden',
    bottom: -50,
    left: -50,
  },
  webview: {
    width: 2,
    height: 2,
  },
});
