import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  type ThemeConfig,
  type ThemeId,
  DEFAULT_THEME,
  THEME_LIST,
  THEME_STORAGE_KEY,
  THEMES,
  applyThemeToDocument,
  getNextTheme,
  isValidThemeId,
  resolveStoredTheme,
} from './theme';

export interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
  themeConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeId;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(explicitInitial?: ThemeId): ThemeId {
  if (explicitInitial && isValidThemeId(explicitInitial)) {
    return explicitInitial;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const resolved = resolveStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
      if (resolved) {
        return resolved;
      }
    } catch {
      // Ignore localStorage access errors (e.g. sandboxed iframe or private browsing)
    }
  }

  return DEFAULT_THEME;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme }) => {
  const [theme, setCurrentTheme] = useState<ThemeId>(() => getInitialTheme(initialTheme));

  // Sync theme with DOM and localStorage whenever theme changes
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage write errors
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    if (isValidThemeId(newTheme)) {
      setCurrentTheme(newTheme);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setCurrentTheme((prev) => getNextTheme(prev));
  }, []);

  const themeConfig = useMemo(() => THEMES[theme] || THEMES[DEFAULT_THEME], [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      cycleTheme,
      themeConfig,
      availableThemes: THEME_LIST,
    }),
    [theme, setTheme, cycleTheme, themeConfig]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
