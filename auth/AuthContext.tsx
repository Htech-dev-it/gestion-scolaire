import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User } from '../types';

interface AuthContextType {
  token: string | null;
  login: (token: string) => User | null;
  logout: () => void;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const parseToken = (tokenToParse: string | null): User | null => {
    if (!tokenToParse) return null;
    try {
      const decodedToken = JSON.parse(atob(tokenToParse.split('.')[1]));
      // The user object now includes nom, prenom, and instance_id
      return { 
        id: decodedToken.id, 
        username: decodedToken.username, 
        role: decodedToken.role,
        instance_id: decodedToken.instance_id,
        ...decodedToken,
      };
    } catch (e) {
      console.error("Failed to parse token:", e);
      // If parsing fails, the token is invalid
      localStorage.removeItem('authToken');
      return null;
    }
  };
  
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const parsedUser = parseToken(storedToken);
    if (parsedUser) {
        setToken(storedToken);
        setUser(parsedUser);
    } else {
        setToken(null);
        setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
        logout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
        window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [logout]);

  const login = (newToken: string): User | null => {
    const parsedUser = parseToken(newToken);
    if (parsedUser) {
        setToken(newToken);
        localStorage.setItem('authToken', newToken);
        setUser(parsedUser);
    }
    return parsedUser;
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};