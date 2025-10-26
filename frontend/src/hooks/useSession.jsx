import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const session = await api.getSession();
      setUser(session);
      setError(null);
    } catch (err) {
      setUser(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const claimUsername = async (username) => {
    const session = await api.claimUsername(username);
    setUser(session);
    setError(null);
    return session;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setError(null);
    window.location.href = '/';
  };

  return {
    user,
    loading,
    error,
    refresh,
    claimUsername,
    logout
  };
}
