import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, Component, ReactNode } from "react";
import { LoginPage } from "./components/LoginPage";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { SettingsPage } from "./components/SettingsPage";
import { IDE } from "./components/IDE";
import { LoadingScreen } from "./components/LoadingScreen";
import { useAppStore } from "./stores/appStore";
import { useAuthStore } from "./stores/authStore";
import { onAuthChange, getCurrentShellUser } from "./lib/firebase";
import type { ShellUser } from "./lib/firebase";

// Error boundary to catch crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#1e1e1e', 
          color: 'white',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h1 style={{ marginBottom: '16px' }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              // Clear auth state and reload
              localStorage.removeItem('auth-storage');
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              background: '#60b24f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reset & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { initialized, initialize, theme } = useAppStore();
  const { user, isAuthenticated, isLoading, setUser, setLoading, isSessionValid, refreshSession, logout } = useAuthStore();

  // Initialize app
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Determine actual theme (handle system preference)
    let actualTheme = theme;
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Apply theme class
    root.classList.remove('dark', 'light');
    root.classList.add(actualTheme);
    
    // Store in localStorage for persistence
    localStorage.setItem('shell-theme', theme);
  }, [theme]);

  // Check session validity on mount
  useEffect(() => {
    // If session is expired, log out
    if (isAuthenticated && !isSessionValid()) {
      console.log('Session expired, logging out');
      logout();
    }
  }, [isAuthenticated, isSessionValid, logout]);

  // Listen for auth state changes (Firebase auth only, not code-based auth)
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in via Firebase, get their Shell user data
        const shellUser = await getCurrentShellUser();
        setUser(shellUser);
        // Refresh session on each auth state change
        refreshSession();
      } else {
        // Only clear user if we don't have a local session
        // (handles code-based auth where there's no Firebase session)
        const currentState = useAuthStore.getState();
        if (!currentState.isSessionValid()) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, refreshSession]);

  // Handle login success
  const handleLoginSuccess = (user: ShellUser) => {
    console.log('Login success:', user.email);
    setUser(user);
  };

  // Loading state
  if (!initialized || isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/ide" element={<IDE />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
