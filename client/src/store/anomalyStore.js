import { create } from 'zustand';

export const useAnomalyStore = create((set) => ({
  anomalies: [],
  total: 0,
  page: 1,
  limit: 50,
  loading: false,
  filters: {
    risk: '',
    protocol: '',
    srcIp: '',
    dstIp: '',
    datasetId: '',
    status: '',
    from: '',
    to: '',
  },

  setAnomalies: (anomalies, total) => set({ anomalies, total }),
  setPage: (page) => set({ page }),
  setLoading: (loading) => set({ loading }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value }, page: 1 })),
  resetFilters: () => set({ filters: { risk: '', protocol: '', srcIp: '', dstIp: '', datasetId: '', status: '', from: '', to: '' }, page: 1 }),

  prependAnomaly: (anomaly) =>
    set((s) => ({
      anomalies: [anomaly, ...s.anomalies].slice(0, s.limit),
      total: s.total + 1,
    })),
}));
