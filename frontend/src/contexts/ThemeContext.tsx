import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, type Theme } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const savedMode = localStorage.getItem('theme-mode');
        // If the user said "i want my ui to be in dark mode right now", 
        // they might have a stale "light" value. Let's force dark once.
        const hasForcedDark = localStorage.getItem('theme-forced-dark-v1');
        if (!hasForcedDark) {
            localStorage.setItem('theme-forced-dark-v1', 'true');
            return 'dark';
        }
        return (savedMode as ThemeMode) || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('theme-mode', mode);
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [mode]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: '#6366f1', // Indigo 500
                        light: '#818cf8',
                        dark: '#4f46e5',
                    },
                    secondary: {
                        main: '#ec4899', // Pink 500
                        light: '#f472b6',
                        dark: '#db2777',
                    },
                    background: {
                        default: mode === 'light' ? '#f8fafc' : '#030712', // Slightly darker for dark mode
                        paper: mode === 'light' ? '#ffffff' : '#111827',
                    },
                    text: {
                        primary: mode === 'light' ? '#1e293b' : '#f1f5f9',
                        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
                    },
                    divider: mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
                },
                typography: {
                    fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
                    h1: { fontWeight: 700 },
                    h2: { fontWeight: 700 },
                    h3: { fontWeight: 600 },
                    button: { textTransform: 'none', fontWeight: 600 },
                },
                shape: {
                    borderRadius: 12,
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: '10px',
                                padding: '8px 20px',
                                boxShadow: 'none',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                                },
                            },
                            containedPrimary: {
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                ...(mode === 'dark' && {
                                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                }),
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(3, 7, 18, 0.8)',
                                backdropFilter: 'blur(12px)',
                                color: mode === 'light' ? '#1e293b' : '#f1f5f9',
                                boxShadow: 'none',
                                borderBottom: mode === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)',
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, theme }}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
};
