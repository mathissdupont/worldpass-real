import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_KEY = 'worldpass_theme';

const themes = {
  light: {
    name: 'light',
    colors: {
      background: '#f5f5f5',
      card: '#ffffff',
      cardSecondary: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      primary: '#4f46e5',
      primaryLight: '#eef2ff',
      success: '#22c55e',
      successLight: '#dcfce7',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      danger: '#ef4444',
      dangerLight: '#fee2e2',
      info: '#3b82f6',
      infoLight: '#eff6ff',
    },
    isDark: false,
  },
  dark: {
    name: 'dark',
    colors: {
      background: '#0f172a',
      card: '#1e293b',
      cardSecondary: '#334155',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      border: '#334155',
      borderLight: '#475569',
      primary: '#6366f1',
      primaryLight: '#312e81',
      success: '#22c55e',
      successLight: '#14532d',
      warning: '#f59e0b',
      warningLight: '#78350f',
      danger: '#ef4444',
      dangerLight: '#7f1d1d',
      info: '#3b82f6',
      infoLight: '#1e3a8a',
    },
    isDark: true,
  },
};

const ThemeContext = createContext({
  theme: themes.light,
  themeName: 'light',
  setTheme: async () => {},
  toggleTheme: async () => {},
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

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
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
  };

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
