import api from './api';
import { datasetsDB, anomaliesDB, auditLogsDB, syncQueueDB, cacheDB } from './indexedDB';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const CACHE_TTL = 5 * 60 * 1000;

class OfflineAPI {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners();
    this.processSyncQueue();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.isOnline));
  }

  async getCache(key) {
    const cached = await cacheDB.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  async setCache(key, data) {
    await cacheDB.set(key, { timestamp: Date.now(), data });
  }

  async get(url, options = {}) {
    const cacheKey = `GET:${url}:${JSON.stringify(options.params || {})}`;
    
    if (!this.isOnline) {
      const cached = await this.getCache(cacheKey);
      if (cached) {
        return { data: cached, offline: true };
      }
      throw new Error('OFFLINE_NO_DATA');
    }

    try {
      const response = await api.get(url, options);
      await this.setCache(cacheKey, response.data);
      return { data: response.data, offline: false };
    } catch (error) {
      const cached = await this.getCache(cacheKey);
      if (cached) {
        return { data: cached, offline: true, stale: true };
      }
      throw error;
    }
  }

  async post(url, data, options = {}) {
    if (!this.isOnline) {
      await syncQueueDB.add({
        method: 'POST',
        url,
        data,
        options,
        timestamp: Date.now(),
      });
      throw new Error('OFFLINE_QUEUED');
    }

    return api.post(url, data, options);
  }

  async patch(url, data, options = {}) {
    if (!this.isOnline) {
      await syncQueueDB.add({
        method: 'PATCH',
        url,
        data,
        options,
        timestamp: Date.now(),
      });
      throw new Error('OFFLINE_QUEUED');
    }

    return api.patch(url, data, options);
  }

  async delete(url, options = {}) {
    if (!this.isOnline) {
      await syncQueueDB.add({
        method: 'DELETE',
        url,
        options,
        timestamp: Date.now(),
      });
      throw new Error('OFFLINE_QUEUED');
    }

    return api.delete(url, options);
  }

  async processSyncQueue() {
    const pending = await syncQueueDB.getPending();
    
    for (const op of pending) {
      try {
        switch (op.method) {
          case 'POST':
            await api.post(op.url, op.data, op.options);
            break;
          case 'PATCH':
            await api.patch(op.url, op.data, op.options);
            break;
          case 'DELETE':
            await api.delete(op.url, op.options);
            break;
        }
        await syncQueueDB.updateStatus(op.id, 'completed');
      } catch (error) {
        await syncQueueDB.updateStatus(op.id, 'failed', error.message);
        await syncQueueDB.incrementRetry(op.id);
      }
    }
  }

  async fetchAndCacheDatasets() {
    try {
      const response = await this.get('/dataset');
      if (response.data?.datasets) {
        await datasetsDB.putMany(response.data.datasets);
      }
      return response;
    } catch (error) {
      console.warn('Failed to fetch datasets, using cache:', error);
      const cached = await datasetsDB.getAll();
      return { data: { datasets: cached }, offline: true };
    }
  }

  async fetchAndCacheAnomalies(filters = {}) {
    try {
      const response = await this.get('/anomalies', { params: filters });
      if (response.data?.anomalies) {
        await anomaliesDB.putMany(response.data.anomalies);
      }
      return response;
    } catch (error) {
      console.warn('Failed to fetch anomalies, using cache:', error);
      let cached = await anomaliesDB.getAll();
      
      if (filters.classification) {
        cached = cached.filter(a => a.classification === filters.classification);
      }
      if (filters.status) {
        cached = cached.filter(a => a.status === filters.status);
      }
      
      return { data: { anomalies: cached, total: cached.length }, offline: true };
    }
  }

  async fetchAndCacheDashboard(datasetId = '') {
    try {
      const response = await this.get('/dashboard/stats', { 
        params: datasetId ? { datasetId } : {} 
      });
      return response;
    } catch (error) {
      console.warn('Failed to fetch dashboard, using cache:', error);
      return { data: null, offline: true };
    }
  }

  async fetchAndCacheAuditLogs(filters = {}) {
    try {
      const response = await this.get('/audit/logs', { params: filters });
      if (response.data?.logs) {
        await auditLogsDB.putMany(response.data.logs);
      }
      return response;
    } catch (error) {
      console.warn('Failed to fetch audit logs, using cache:', error);
      const cached = await auditLogsDB.getAll();
      return { data: { logs: cached }, offline: true };
    }
  }

  async updateAnomalyFlag(id, flagged) {
    if (!this.isOnline) {
      await anomaliesDB.updateFlag(id, flagged);
      await syncQueueDB.add({
        method: 'PATCH',
        url: `/anomalies/${id}/flag`,
        data: { flagged },
        timestamp: Date.now(),
      });
      return { offline: true, localUpdate: true };
    }

    return api.patch(`/anomalies/${id}/flag`, { flagged });
  }

  async getOfflineStats() {
    const [datasets, anomalies, logs] = await Promise.all([
      datasetsDB.getAll(),
      anomaliesDB.getAll(),
      auditLogsDB.getAll(),
    ]);

    const critical = anomalies.filter(a => a.classification === 'critical').length;
    const suspicious = anomalies.filter(a => a.classification === 'suspicious').length;

    return {
      datasets: datasets.length,
      anomalies: anomalies.length,
      critical,
      suspicious,
      logs: logs.length,
    };
  }
}

export const offlineAPI = new OfflineAPI();
export default offlineAPI;