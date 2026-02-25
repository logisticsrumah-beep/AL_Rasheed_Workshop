import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useData } from './DataContext'; // Import useData hook
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  login: (userId: string, password: string, save: boolean) => boolean;
  logout: () => void;
  createUser: (user: Omit<User, 'role' | 'status'>) => boolean;
  changePassword: (oldPassword: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAdmin: User = { id: 'Admin', password: '123', role: 'admin', status: 'active' };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const data = useData(); // Consume data from DataContext
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (data?.users) {
      // Ensure default admin exists if not present in the sheet
      const adminExists = data.users.some(u => u.id === 'Admin' && u.role === 'admin');
      if (!adminExists) {
        setUsers([defaultAdmin, ...data.users]);
      } else {
        setUsers(data.users);
      }
    }
  }, [data?.users]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for saved user on initial load
    try {
        const savedUser = window.localStorage.getItem('currentUser');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
    } catch (e) {
        console.error("Failed to parse saved user", e);
        window.localStorage.removeItem('currentUser');
    }
  }, []);

  const login = (userId: string, password: string, save: boolean): boolean => {
    const user = users.find(u => u.id === userId && u.password === password);
    if (user) {
      if (user.status === 'pending') {
        alert('Your account is pending approval from an administrator.');
        return false;
      }
      setCurrentUser(user);
      if (save) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('currentUser');
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };
  
  const createUser = (newUser: Omit<User, 'role' | 'status'>): boolean => {
    if (users.some(u => u.id === newUser.id)) {
        return false;
    }
    setUsers(prev => [...prev, { ...newUser, role: 'user', status: 'pending' }]);
    return true;
  };
  
  const changePassword = (oldPassword: string, newPassword: string): boolean => {
    if (!currentUser) return false;

    if (currentUser.password !== oldPassword) {
        return false; // Let UI handle the alert
    }

    const updatedUser = { ...currentUser, password: newPassword };
    
    // Update the main users list
    setUsers(prevUsers => 
        prevUsers.map(u => (u.id === currentUser.id ? updatedUser : u))
    );

    // Update the current user state
    setCurrentUser(updatedUser);

    // Update localStorage if the session was saved
    if (localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
    
    return true; // Let UI handle the success alert
  };


  return (
    <AuthContext.Provider value={{ currentUser, users, setUsers, login, logout, createUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};