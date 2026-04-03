import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
  refresh:  ()     => api.post('/auth/refresh'),
  getUsers: ()     => api.get('/auth/users'),
  updateUser: (id, data) => api.patch(`/auth/users/${id}`, data),
};
