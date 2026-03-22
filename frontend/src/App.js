import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('sm_token'));

  useEffect(() => {
    const onStorage = () => setToken(localStorage.getItem('sm_token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = (t) => {
    localStorage.setItem('sm_token', t);
    setToken(t);
  };
  const handleLogout = () => {
    localStorage.removeItem('sm_token');
    setToken(null);
  };

  if (!token) return <LoginPage onLogin={handleLogin} />;
  return <MainPage onLogout={handleLogout} />;
}
