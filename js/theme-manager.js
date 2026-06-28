/**
 * Theme Manager — handles theme switching, font loading, and UI preferences.
 * New localStorage keys: appTheme, animationsEnabled (soundEnabled managed by SoundManager)
 */
const ThemeManager = (() => {
  const THEMES = {
    ocean: {
      name: 'Ocean Kingdom',
      font: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
    },
    sky: {
      name: 'Sky Castle',
      font: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap'
    },
    pirate: {
      name: 'Pirate Seas',
      font: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap'
    },
    panda: {
      name: 'Deep Panda Forest',
      font: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap'
    }
  };

  const STORAGE_THEME = 'appTheme';
  const STORAGE_ANIMATIONS = 'animationsEnabled';
  const DEFAULT_THEME = 'ocean';

  let currentTheme = DEFAULT_THEME;

  function loadFont(themeId) {
    const link = document.getElementById('theme-font');
    if (link && THEMES[themeId]) {
      link.href = THEMES[themeId].font;
    }
  }

  function applyTheme(themeId) {
    if (!THEMES[themeId]) themeId = DEFAULT_THEME;
    currentTheme = themeId;
    document.documentElement.dataset.theme = themeId;
    loadFont(themeId);
    localStorage.setItem(STORAGE_THEME, themeId);
    updateThemeCards(themeId);
    if (window.BackgroundAnimator) {
      BackgroundAnimator.setTheme(themeId);
    }
  }

  function updateThemeCards(activeId) {
    document.querySelectorAll('.theme-card').forEach(card => {
      const isActive = card.dataset.theme === activeId;
      card.classList.toggle('selected', isActive);
      card.setAttribute('aria-checked', isActive);
    });
  }

  function setAnimationsEnabled(enabled) {
    document.documentElement.classList.toggle('no-animations', !enabled);
    localStorage.setItem(STORAGE_ANIMATIONS, enabled ? 'true' : 'false');
    const toggle = document.getElementById('animationToggle');
    if (toggle) {
      toggle.classList.toggle('active', enabled);
      toggle.setAttribute('aria-checked', enabled);
    }
    if (window.BackgroundAnimator) {
      BackgroundAnimator.setEnabled(enabled);
    }
  }

  function isAnimationsEnabled() {
    return localStorage.getItem(STORAGE_ANIMATIONS) !== 'false';
  }

  function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      refreshIcons();
    }
  }

  function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function resetTheme() {
    if (confirm('Reset theme and preferences to defaults?')) {
      applyTheme(DEFAULT_THEME);
      setAnimationsEnabled(true);
      if (window.SoundManager) SoundManager.setEnabled(false);
      window.SoundManager?.play('themeSwitch');
    }
  }

  function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function wireSettings() {
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      window.SoundManager?.play('click');
      openSettings();
    });

    document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
      window.SoundManager?.play('click');
      closeSettings();
    });

    document.getElementById('settingsModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') closeSettings();
    });

    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const themeId = card.dataset.theme;
        if (themeId && themeId !== currentTheme) {
          applyTheme(themeId);
          window.SoundManager?.play('themeSwitch');
        }
      });
    });

    document.getElementById('animationToggle')?.addEventListener('click', function () {
      const enabled = !this.classList.contains('active');
      setAnimationsEnabled(enabled);
      window.SoundManager?.play('click');
    });

    document.getElementById('resetThemeBtn')?.addEventListener('click', resetTheme);

    // Ripple effect on buttons
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        this.style.setProperty('--ripple-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
        this.style.setProperty('--ripple-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
      });
    });
  }

  function wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettings();
        if (typeof closeSidebar === 'function') closeSidebar();
        if (typeof closeAllEventsSidebar === 'function') closeAllEventsSidebar();
      }
    });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_THEME) || DEFAULT_THEME;
    applyTheme(saved);
    setAnimationsEnabled(isAnimationsEnabled());
    wireSettings();
    wireKeyboard();
    refreshIcons();
  }

  return {
    init,
    setTheme: applyTheme,
    getTheme: () => currentTheme,
    toggleAnimations: setAnimationsEnabled,
    resetTheme,
    refreshIcons
  };
})();

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
