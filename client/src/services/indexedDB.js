import { openDB } from 'idb';

const DB_NAME = 'sentinelops-offline';
const DB_VERSION = 1;

let dbPromise = null;

export async function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('datasets')) {
        const datasetStore = db.createObjectStore('datasets', { keyPath: '_id' });
        datasetStore.createIndex('uploadedAt', 'uploadedAt');
      }

      if (!db.objectStoreNames.contains('anomalies')) {
        const anomalyStore = db.createObjectStore('anomalies', { keyPath: '_id' });
        anomalyStore.createIndex('detectedAt', 'detectedAt');
        anomalyStore.createIndex('severity', 'severity');
        anomalyStore.createIndex('flagged', 'flagged');
      }

      if (!db.objectStoreNames.contains('auditLogs')) {
        const auditStore = db.createObjectStore('auditLogs', { keyPath: '_id' });
        auditStore.createIndex('timestamp', 'timestamp');
        auditStore.createIndex('action', 'action');
      }

      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('createdAt', 'createdAt');
        syncStore.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    },
  });

  return dbPromise;
}

export const datasetsDB = {
  async getAll() {
    const db = await initDB();
    return db.getAll('datasets');
  },

  async get(id) {
    const db = await initDB();
    return db.get('datasets', id);
  },

  async put(dataset) {
    const db = await initDB();
    return db.put('datasets', dataset);
  },

  async putMany(datasets) {
    const db = await initDB();
    const tx = db.transaction('datasets', 'readwrite');
    await Promise.all([
      ...datasets.map((d) => tx.store.put(d)),
      tx.done,
    ]);
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('datasets', id);
  },

  async clear() {
    const db = await initDB();
    return db.clear('datasets');
  },
};

export const anomaliesDB = {
  async getAll() {
    const db = await initDB();
    return db.getAll('anomalies');
  },

  async get(id) {
    const db = await initDB();
    return db.get('anomalies', id);
  },

  async put(anomaly) {
    const db = await initDB();
    return db.put('anomalies', anomaly);
  },

  async putMany(anomalies) {
    const db = await initDB();
    const tx = db.transaction('anomalies', 'readwrite');
    await Promise.all([
      ...anomalies.map((a) => tx.store.put(a)),
      tx.done,
    ]);
  },

  async updateFlag(id, flagged) {
    const db = await initDB();
    const anomaly = await db.get('anomalies', id);
    if (anomaly) {
      anomaly.flagged = flagged;
      anomaly.updatedAt = new Date().toISOString();
      return db.put('anomalies', anomaly);
    }
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('anomalies', id);
  },

  async clear() {
    const db = await initDB();
    return db.clear('anomalies');
  },
};

export const auditLogsDB = {
  async getAll() {
    const db = await initDB();
    return db.getAll('auditLogs');
  },

  async get(id) {
    const db = await initDB();
    return db.get('auditLogs', id);
  },

  async put(log) {
    const db = await initDB();
    return db.put('auditLogs', log);
  },

  async putMany(logs) {
    const db = await initDB();
    const tx = db.transaction('auditLogs', 'readwrite');
    await Promise.all([
      ...logs.map((l) => tx.store.put(l)),
      tx.done,
    ]);
  },

  async clear() {
    const db = await initDB();
    return db.clear('auditLogs');
  },
};

export const syncQueueDB = {
  async add(operation) {
    const db = await initDB();
    const item = {
      ...operation,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    };
    return db.add('syncQueue', item);
  },

  async getAll() {
    const db = await initDB();
    return db.getAll('syncQueue');
  },

  async getPending() {
    const db = await initDB();
    const all = await db.getAll('syncQueue');
    return all.filter((item) => item.status === 'pending');
  },

  async updateStatus(id, status, error = null) {
    const db = await initDB();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.status = status;
      item.error = error;
      item.completedAt = status === 'completed' ? new Date().toISOString() : null;
      return db.put('syncQueue', item);
    }
  },

  async incrementRetry(id) {
    const db = await initDB();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.retries += 1;
      return db.put('syncQueue', item);
    }
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('syncQueue', id);
  },

  async clear() {
    const db = await initDB();
    return db.clear('syncQueue');
  },

  async clearCompleted() {
    const db = await initDB();
    const all = await db.getAll('syncQueue');
    const completedIds = all.filter((item) => item.status === 'completed').map((item) => item.id);
    const tx = db.transaction('syncQueue', 'readwrite');
    await Promise.all([
      ...completedIds.map((id) => tx.store.delete(id)),
      tx.done,
    ]);
  },
};

export const cacheDB = {
  async get(key) {
    const db = await initDB();
    const item = await db.get('cache', key);
    return item?.value;
  },

  async set(key, value, ttl = 3600000) {
    const db = await initDB();
    return db.put('cache', {
      key,
      value,
      expiresAt: Date.now() + ttl,
    });
  },

  async delete(key) {
    const db = await initDB();
    return db.delete('cache', key);
  },

  async clear() {
    const db = await initDB();
    return db.clear('cache');
  },
};
