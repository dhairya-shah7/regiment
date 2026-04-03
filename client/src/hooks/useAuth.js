import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth';
import { connectSocket, disconnectSocket } from '../services/websocket';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { user, accessToken, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    setAuth(res.data.user, res.data.accessToken);
    connectSocket();
    return res.data;
  }, [setAuth]);

  const register = useCallback(async (username, email, password) => {
    const res = await authService.register({ username, email, password });
    setAuth(res.data.user, res.data.accessToken);
    connectSocket();
    return res.data;
  }, [setAuth]);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch (error) { void error; }
    disconnectSocket();
    storeLogout();
    navigate('/login');
    toast.success('Logged out');
  }, [storeLogout, navigate]);

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  return { user, accessToken, isAuthenticated, login, register, logout, hasRole };
};
