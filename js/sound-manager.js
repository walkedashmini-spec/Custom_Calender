/**
 * Sound Manager — lightweight Web Audio API synthesis.
 * Persists preference in localStorage key: soundEnabled
 */
const SoundManager = (() => {
  const STORAGE_KEY = 'soundEnabled';
  let enabled = localStorage.getItem(STORAGE_KEY) === 'true';
  let ctx = null;

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, duration, type = 'sine', gain = 0.08) {
    if (!enabled) return;
    try {
      const ac = getContext();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration);
    } catch (_) { /* silent fail */ }
  }

  const sounds = {
    click: () => playTone(800, 0.05, 'sine', 0.06),
    sidebarOpen: () => {
      playTone(400, 0.08, 'sine', 0.05);
      setTimeout(() => playTone(600, 0.1, 'sine', 0.04), 60);
    },
    themeSwitch: () => {
      [523, 659, 784].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.15, 'sine', 0.05), i * 80);
      });
    },
    success: () => {
      playTone(523, 0.1, 'sine', 0.06);
      setTimeout(() => playTone(784, 0.15, 'sine', 0.05), 100);
    },
    reminder: () => {
      playTone(440, 0.2, 'triangle', 0.05);
      setTimeout(() => playTone(554, 0.25, 'triangle', 0.04), 200);
    }
  };

  function play(name) {
    if (sounds[name]) sounds[name]();
  }

  function setEnabled(val) {
    enabled = val;
    localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    updateToggle();
  }

  function updateToggle() {
    const toggle = document.getElementById('soundToggle');
    if (toggle) {
      toggle.classList.toggle('active', enabled);
      toggle.setAttribute('aria-checked', enabled);
    }
  }

  function wireToggle() {
    document.getElementById('soundToggle')?.addEventListener('click', function () {
      enabled = !enabled;
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
      updateToggle();
      if (enabled) play('click');
    });
    updateToggle();
  }

  document.addEventListener('DOMContentLoaded', wireToggle);

  return { play, setEnabled, isEnabled: () => enabled };
})();

window.SoundManager = SoundManager;
