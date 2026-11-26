// Looping emergency siren audio + repeating vibration. Runs until stopSiren() (accept / reject / taken / expired).
import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';

const listeners = new Set();
let isPlaying = false;
let soundInstance = null;
let webAudio = null;
let webAudioCtx = null;
let webOsc = null;
let webGain = null;
let webAudioTimer = null;
let vibrateInterval = null;

export function addSirenListener(fn) {
  listeners.add(fn);
  try {
    fn(isPlaying);
  } catch {}
  return () => {
    listeners.delete(fn);
  };
}

export async function preloadSiren() {
  if (Platform.OS !== 'web') {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      if (!soundInstance) {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/siren.wav'),
          { isLooping: true, volume: 1.0, shouldPlay: false }
        );
        soundInstance = sound;
      }
    } catch (e) {
      // Audio preloading failure is non-fatal
    }
  } else {
    try {
      if (typeof window !== 'undefined' && !webAudio) {
        webAudio = new window.Audio(require('../assets/siren.wav'));
        webAudio.loop = true;
        webAudio.volume = 1.0;
      }
    } catch (e) {}
  }
}

function startWebSynthesizer() {
  if (typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!webAudioCtx) webAudioCtx = new AC();
    if (webAudioCtx.state === 'suspended') webAudioCtx.resume();

    if (webOsc) return;
    webOsc = webAudioCtx.createOscillator();
    webGain = webAudioCtx.createGain();
    webOsc.type = 'sawtooth';
    webGain.gain.setValueAtTime(0.8, webAudioCtx.currentTime);

    webOsc.connect(webGain);
    webGain.connect(webAudioCtx.destination);
    webOsc.start();

    let high = true;
    webAudioTimer = setInterval(() => {
      if (!isPlaying || !webOsc || !webAudioCtx) return;
      high = !high;
      const freq = high ? 960 : 770;
      try {
        webOsc.frequency.setValueAtTime(freq, webAudioCtx.currentTime);
      } catch (e) {}
    }, 420);
  } catch (e) {}
}

function stopWebSynthesizer() {
  if (webAudioTimer) {
    clearInterval(webAudioTimer);
    webAudioTimer = null;
  }
  if (webOsc) {
    try {
      webOsc.stop();
      webOsc.disconnect();
    } catch (e) {}
    webOsc = null;
  }
  if (webGain) {
    try {
      webGain.disconnect();
    } catch (e) {}
    webGain = null;
  }
}

export async function startSiren() {
  if (isPlaying) return;
  isPlaying = true;

  // 1. REPEATING VIBRATION
  try {
    // Android native vibration pattern: 0ms delay, 800ms buzz, 350ms pause, 800ms buzz, 350ms pause
    Vibration.vibrate([0, 800, 350, 800, 350], true);
  } catch (e) {}

  // Fallback repeating vibration pulse every 2.3 seconds to guarantee it never stops
  if (vibrateInterval) clearInterval(vibrateInterval);
  vibrateInterval = setInterval(() => {
    if (!isPlaying) {
      clearInterval(vibrateInterval);
      return;
    }
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([800, 350, 800, 350]);
        }
      } else {
        Vibration.vibrate([0, 800, 350], false);
      }
    } catch (e) {}
  }, 2300);

  // 2. LOUD AUDIO PLAYBACK
  if (Platform.OS !== 'web') {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      if (!soundInstance) {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/siren.wav'),
          { isLooping: true, volume: 1.0, shouldPlay: true }
        );
        soundInstance = sound;
      } else {
        await soundInstance.setIsLoopingAsync(true);
        await soundInstance.setVolumeAsync(1.0);
        await soundInstance.setPositionAsync(0);
        await soundInstance.playAsync();
      }
    } catch (e) {
      console.warn('Native siren audio play error:', e);
    }
  } else {
    // Web Audio playback
    try {
      if (typeof window !== 'undefined') {
        if (!webAudio) {
          webAudio = new window.Audio(require('../assets/siren.wav'));
          webAudio.loop = true;
          webAudio.volume = 1.0;
        }
        webAudio.currentTime = 0;
        webAudio.play().catch(() => {
          startWebSynthesizer();
        });
      }
    } catch (e) {
      startWebSynthesizer();
    }
  }

  listeners.forEach((fn) => {
    try { fn(true); } catch {}
  });
}

export async function stopSiren() {
  if (!isPlaying) return;
  isPlaying = false;

  // 1. Cancel vibration
  try {
    Vibration.cancel();
    if (vibrateInterval) {
      clearInterval(vibrateInterval);
      vibrateInterval = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  } catch (e) {}

  // 2. Stop audio
  if (Platform.OS !== 'web') {
    if (soundInstance) {
      try {
        await soundInstance.stopAsync();
      } catch (e) {}
    }
  } else {
    if (webAudio) {
      try {
        webAudio.pause();
        webAudio.currentTime = 0;
      } catch (e) {}
    }
    stopWebSynthesizer();
  }

  listeners.forEach((fn) => {
    try { fn(false); } catch {}
  });
}
