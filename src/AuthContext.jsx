import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, createUser, db } from './db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('recipeapp_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        // Verify user still exists in DB (guards against storage isolation issues)
        db.users.get(u.id).then(dbUser => {
          if (dbUser) {
            setUser(u);
          } else {
            localStorage.removeItem('recipeapp_user');
          }
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      } catch {
        localStorage.removeItem('recipeapp_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const u = await loginUser(username, password);
    setUser(u);
    localStorage.setItem('recipeapp_user', JSON.stringify(u));
    return u;
  };

  const register = async (username, password) => {
    await createUser(username, password);
    return login(username, password);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('recipeapp_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
