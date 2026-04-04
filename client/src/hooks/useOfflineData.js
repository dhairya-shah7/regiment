import { useState, useEffect, useCallback, useRef } from 'react';
import offlineAPI from '../services/offlineAPI';
import { useNetworkStatus } from './useNetworkStatus';

export function useOfflineData(fetchFn, options = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const [stale, setStale] = useState(false);
  const { isOnline } = useNetworkStatus();

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result.data);
      setOffline(result.offline || false);
      setStale(result.stale || false);
    } catch (err) {
      if (err.message === 'OFFLINE_NO_DATA') {
        setOffline(true);
        setError(new Error('No cached data available'));
      } else {
        setError(err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!autoRefresh || !isOnline) return;
    const interval = setInterval(() => fetch(true), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, isOnline, refreshInterval, fetch]);

  useEffect(() => {
    if (isOnline) {
      fetch(true);
    }
  }, [isOnline]);

  return { data, loading, error, offline, stale, refetch: () => fetch() };
}

export function useOfflineDatasets(options = {}) {
  const fetchFn = useCallback(() => offlineAPI.fetchAndCacheDatasets(), []);
  return useOfflineData(fetchFn, options);
}

export function useOfflineAnomalies(filters = {}, options = {}) {
  const filtersKey = JSON.stringify(filters);
  const fetchFn = useCallback(() => offlineAPI.fetchAndCacheAnomalies(JSON.parse(filtersKey)), [filtersKey]);
  return useOfflineData(fetchFn, options);
}

export function useOfflineDashboard(datasetId = '', options = {}) {
  const fetchFn = useCallback(() => offlineAPI.fetchAndCacheDashboard(datasetId), [datasetId]);
  return useOfflineData(fetchFn, options);
}

export function useOfflineStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        if (isOnline) {
          const result = await offlineAPI.fetchAndCacheDashboard();
          if (result.data?.kpis) {
            setStats({ ...result.data.kpis, source: 'server' });
          }
        }
        
        if (!isOnline || !stats) {
          const localStats = await offlineAPI.getOfflineStats();
          setStats({
            totalRecords: localStats.anomalies,
            anomalyCount: localStats.anomalies,
            criticalCount: localStats.critical,
            suspiciousCount: localStats.suspicious,
            totalDatasets: localStats.datasets,
            source: 'local',
          });
        }
      } catch (err) {
        const localStats = await offlineAPI.getOfflineStats();
        setStats({
          totalRecords: localStats.anomalies,
          anomalyCount: localStats.anomalies,
          criticalCount: localStats.critical,
          suspiciousCount: localStats.suspicious,
          totalDatasets: localStats.datasets,
          source: 'local',
        });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [isOnline]);

  return { stats, loading };
}