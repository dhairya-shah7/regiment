import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  alerts: [],
  addAlert: (alert) => set((s) => ({ alerts: [{ id: Date.now(), ...alert }, ...s.alerts].slice(0, 20) })),
  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  notifications: 0,
  setNotifications: (n) => set({ notifications: n }),
  incrementNotifications: () => set((s) => ({ notifications: s.notifications + 1 })),
  clearNotifications: () => set({ notifications: 0 }),
}));
