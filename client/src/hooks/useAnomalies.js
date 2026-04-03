import { useEffect, useCallback } from 'react';
import { useAnomalyStore } from '../store/anomalyStore';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useAnomalies = () => {
  const { anomalies, total, page, limit, loading, filters, setAnomalies, setPage, setLoading, setFilter, resetFilters } =
    useAnomalyStore();

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...filters };
      // Strip empty filters
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/anomalies', { params });
      setAnomalies(res.data.anomalies, res.data.total);
    } catch {
      toast.error('Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, setAnomalies, setLoading]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const flagAnomaly = async (id, data) => {
    const res = await api.patch(`/anomalies/${id}/flag`, data);
    toast.success('Anomaly updated');
    fetchAnomalies();
    return res.data;
  };

  return { anomalies, total, page, limit, loading, filters, setPage, setFilter, resetFilters, flagAnomaly, refetch: fetchAnomalies };
};
