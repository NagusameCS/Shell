import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { LoginPage } from "./components/LoginPage";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { SettingsPage } from "./components/SettingsPage";
import { IDE } from "./components/IDE";
import { LoadingScreen } from "./components/LoadingScreen";
import { useAppStore } from "./stores/appStore";
import { useAuthStore } from "./stores/authStore";
import { onAuthChange, getCurrentShellUser } from "./lib/firebase";
import type { ShellUser } from "./lib/firebase";

function App() {
  const { initialized, initialize } = useAppStore();
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();

  // Initialize app
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get their Shell user data
        const shellUser = await getCurrentShellUser();
        setUser(shellUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  // Handle login success
  const handleLoginSuccess = (user: ShellUser) => {
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
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/ide" element={<IDE />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
