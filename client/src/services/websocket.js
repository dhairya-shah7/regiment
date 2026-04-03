import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket = null;

export const connectSocket = () => {
  const token = useAuthStore.getState().accessToken;
  if (!token || socket?.connected) return;

  socket = io('http://localhost:4000', {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket.id);
    socket.emit('subscribe:dashboard');
  });

  socket.on('connect_error', (err) => {
    console.warn('[WS] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const subscribeToJob = (jobId) => {
  if (socket) socket.emit('subscribe:job', jobId);
};

export const onEvent = (event, handler) => {
  if (socket) socket.on(event, handler);
};

export const offEvent = (event, handler) => {
  if (socket) socket.off(event, handler);
};
