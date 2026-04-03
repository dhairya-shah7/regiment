import { useEffect } from 'react';
import { connectSocket, getSocket, onEvent, offEvent } from '../services/websocket';
import { useUIStore } from '../store/uiStore';
import { useAnomalyStore } from '../store/anomalyStore';

export const useWebSocket = () => {
  const { addAlert, incrementNotifications } = useUIStore();
  const { prependAnomaly } = useAnomalyStore();

  useEffect(() => {
    connectSocket();

    const handleAnomalyNew = (anomaly) => {
      prependAnomaly(anomaly);
      if (anomaly.classification === 'critical') {
        addAlert({ level: 'critical', message: `Critical anomaly detected from ${anomaly.srcIp}`, anomaly });
        incrementNotifications();
      }
    };

    const handleSystemAlert = (data) => {
      addAlert(data);
      if (data.level === 'critical') incrementNotifications();
    };

    onEvent('anomaly:new', handleAnomalyNew);
    onEvent('system:alert', handleSystemAlert);

    return () => {
      offEvent('anomaly:new', handleAnomalyNew);
      offEvent('system:alert', handleSystemAlert);
    };
  }, [addAlert, incrementNotifications, prependAnomaly]);
};

export const useJobSocket = (jobId, onProgress, onComplete) => {
  useEffect(() => {
    if (!jobId) return;

    connectSocket();
    const socket = getSocket();
    if (socket) socket.emit('subscribe:job', jobId);

    const handleProgress = (data) => {
      if (data.jobId === jobId) onProgress?.(data);
    };
    const handleComplete = (data) => {
      if (data.jobId === jobId) onComplete?.(data);
    };

    onEvent('analysis:progress', handleProgress);
    onEvent('analysis:complete', handleComplete);

    return () => {
      offEvent('analysis:progress', handleProgress);
      offEvent('analysis:complete', handleComplete);
    };
  }, [jobId, onProgress, onComplete]);
};
