import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { User, UserRole } from '../types.ts';
import { DataContext } from './DataContext.tsx';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  logout: () => void;
  register: (fullName: string, email: string, fbLink: string, password: string) => Promise<{ error: { message: string } | null }>;
  updatePassword: (password: string) => Promise<{ error: { message: string } | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const dataContext = useContext(DataContext);

  useEffect(() => {
    // In a real app, you'd check a token in localStorage here.
    // For this mock setup, we just start with no user.
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (!dataContext) return { error: { message: "Data context not available" } };
    const foundUser = dataContext.state.users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      return { error: null };
    }
    return { error: { message: 'Invalid credentials' } };
  };

  const logout = () => {
    setUser(null);
  };

  const register = async (fullName: string, email: string, fbLink: string, password: string) => {
    if (!dataContext) return { error: { message: "Data context not available" } };
    if (dataContext.state.users.some(u => u.email === email)) {
      return { error: { message: 'An account with this email already exists.' } };
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      fullName,
      email,
      password,
      fbLink,
      role: UserRole.PARTICIPANT,
    };
    dataContext.dispatch({ type: 'ADD_USER', payload: newUser });
    // In a real app, you'd wait for email confirmation. Here, we log them in.
    setUser(newUser);
    return { error: null };
  };

  const updatePassword = async (password: string) => {
    if (!user || !dataContext) return { error: { message: "Not logged in" } };
    const updatedUser = { ...user, password };
    dataContext.dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    setUser(updatedUser);
    return { error: null };
  };

  const value = { user, loading, login, logout, register, updatePassword };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
