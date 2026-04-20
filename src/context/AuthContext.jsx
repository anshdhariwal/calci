import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('calci_token');
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem('calci_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    localStorage.setItem('calci_token', data.token);
    setUser({ _id: data._id, username: data.username, email: data.email });
    return data;
  };

  const register = async (username, email, password) => {
    const data = await registerUser({ username, email, password });
    localStorage.setItem('calci_token', data.token);
    setUser({ _id: data._id, username: data.username, email: data.email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('calci_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
