import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient, User } from '@/lib/api-client';
import { Employee } from '@/lib/workforce-data';

interface AuthState {
  user: User | null;
  linkedEmployee: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendAvailable: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    linkedEmployee: null,
    isAuthenticated: false,
    isLoading: true,
    isBackendAvailable: false,
  });

  // Check if backend is available
  const checkBackend = useCallback(async (): Promise<boolean> => {
    try {
      await apiClient.healthCheck();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Check current auth status
  const checkAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // First check if backend is available
      const backendAvailable = await checkBackend();
      
      if (!backendAvailable) {
        setState({
          user: null,
          linkedEmployee: null,
          isAuthenticated: false,
          isLoading: false,
          isBackendAvailable: false,
        });
        return;
      }

      // Check if we have a token
      const token = apiClient.getToken();
      if (!token) {
        setState({
          user: null,
          linkedEmployee: null,
          isAuthenticated: false,
          isLoading: false,
          isBackendAvailable: true,
        });
        return;
      }

      // Validate token by fetching current user
      const { user, linkedEmployee } = await apiClient.getCurrentUser();
      setState({
        user,
        linkedEmployee,
        isAuthenticated: true,
        isLoading: false,
        isBackendAvailable: true,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      apiClient.setToken(null);
      setState({
        user: null,
        linkedEmployee: null,
        isAuthenticated: false,
        isLoading: false,
        isBackendAvailable: true, // Backend is available, just not authenticated
      });
    }
  }, [checkBackend]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    const { user } = await apiClient.login(email, password);
    const { linkedEmployee } = await apiClient.getCurrentUser();
    setState({
      user,
      linkedEmployee,
      isAuthenticated: true,
      isLoading: false,
      isBackendAvailable: true,
    });
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setState(prev => ({
      ...prev,
      user: null,
      linkedEmployee: null,
      isAuthenticated: false,
    }));
  }, []);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setState(prev => ({
        ...prev,
        user: null,
        linkedEmployee: null,
        isAuthenticated: false,
      }));
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
    isAdmin: state.user?.role === 'admin',
    isManager: state.user?.role === 'admin' || state.user?.role === 'manager',
    canManageUsers: state.user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
