import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import tokens from '@tokens';

const THEME_KEY = 'worldpass_theme';

const buildTheme = (mode) => {
  const base = tokens.themes[mode];
  if (!base) {
    return tokens.themes.light;
  }

  const colors = {
    ...base.colors,
    cardSecondary: base.colors.cardMuted,
    cardSurface: base.colors.card,
    overlay: base.colors.overlay,
    primarySurface: base.colors.primaryMuted,
    chip: base.colors.chip,
  };

  return {
    name: mode,
    isDark: Boolean(base.isDark),
    colors,
    spacing: tokens.spacing,
    radii: tokens.radii,
    typography: tokens.typography,
    shadows: tokens.nativeShadows[mode] || tokens.nativeShadows.light,
  };
};

const themes = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};

const ThemeContext = createContext({
  theme: themes.light,
  themeName: 'light',
  setTheme: async () => {},
  toggleTheme: async () => {},
  loaded: false,
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeName] = useState('system');
  const [loaded, setLoaded] = useState(false);

  const actualTheme = useMemo(() => {
    if (themeName === 'system') {
      return systemColorScheme === 'dark' ? themes.dark : themes.light;
    }
    return themes[themeName] || themes.light;
  }, [themeName, systemColorScheme]);

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setThemeName(stored);
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const setTheme = useCallback(async (name) => {
    if (name === 'light' || name === 'dark' || name === 'system') {
      setThemeName(name);
      try {
        await AsyncStorage.setItem(THEME_KEY, name);
      } catch (error) {
        console.warn('Failed to save theme preference:', error);
      }
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = actualTheme.isDark ? 'light' : 'dark';
    await setTheme(next);
  }, [actualTheme, setTheme]);

  const value = useMemo(() => ({
    theme: actualTheme,
    themeName,
    setTheme,
    toggleTheme,
    loaded,
  }), [actualTheme, themeName, setTheme, toggleTheme, loaded]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { themes };
