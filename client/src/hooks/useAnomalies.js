import { useEffect, useCallback, useState } from 'react';
import { useAnomalyStore } from '../store/anomalyStore';
import offlineAPI from '../services/offlineAPI';
import toast from 'react-hot-toast';

export const useAnomalies = () => {
  const { anomalies, total, page, limit, loading, filters, setAnomalies, setPage, setLoading, setFilter, resetFilters } =
    useAnomalyStore();
  const [offline, setOffline] = useState(false);

  const fetchAnomalies = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { page, limit, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      
      const result = await offlineAPI.fetchAndCacheAnomalies(params);
      setAnomalies(result.data.anomalies, result.data.total);
      setOffline(result.offline || false);
    } catch (err) {
      if (!offline) {
        toast.error('Failed to load anomalies');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, limit, filters, setAnomalies, setLoading]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const flagAnomaly = async (id, data) => {
    try {
      const result = await offlineAPI.updateAnomalyFlag(id, data);
      if (result.offline) {
        toast.success('Flagged locally (will sync when online)');
        fetchAnomalies(true);
      } else {
        toast.success('Anomaly updated');
        fetchAnomalies();
      }
      return result;
    } catch (err) {
      if (err.message === 'OFFLINE_QUEUED') {
        toast.success('Queued for sync');
        return { offline: true, queued: true };
      }
      throw err;
    }
  };

  return { 
    anomalies, 
    total, 
    page, 
    limit, 
    loading, 
    offline,
    filters, 
    setPage, 
    setFilter, 
    resetFilters, 
    flagAnomaly, 
    refetch: fetchAnomalies 
  };
};