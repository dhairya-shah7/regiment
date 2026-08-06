import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
  refresh:  ()     => api.post('/auth/refresh'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOTP:      (data) => api.post('/auth/verify-otp', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  getUsers: ()     => api.get('/auth/users'),
  updateUser: (id, data) => api.patch(`/auth/users/${id}`, data),
};
