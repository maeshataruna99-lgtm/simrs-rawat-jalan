/**
 * Penyedia tema terang/gelap: memasang class `dark` di <html> dan menyimpan pilihan di localStorage.
 * Mengikuti panduan dark mode shadcn/ui untuk Vite.
 *
 * Dipakai di: App.tsx (ThemeProvider), AppThemeToggle.tsx dan components/ui/sonner.tsx (useTheme).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'simrs_theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(defaultTheme));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Penyimpanan tidak tersedia (mode privat); tema tetap berlaku selama sesi.
    }
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme harus dipakai di dalam ThemeProvider');
  }
  return context;
}
