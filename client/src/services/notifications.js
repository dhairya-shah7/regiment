import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      enabled: false,
      soundEnabled: true,
      criticalOnly: false,
      alertThreshold: 0.7,
      lastNotificationTime: null,

      setEnabled: (enabled) => set({ enabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setCriticalOnly: (criticalOnly) => set({ criticalOnly }),
      setAlertThreshold: (alertThreshold) => set({ alertThreshold }),

      shouldNotify: (riskScore, classification) => {
        const { enabled, criticalOnly, alertThreshold } = get();
        if (!enabled) return false;
        if (criticalOnly) {
          return classification === 'critical' || riskScore >= 0.8;
        }
        return riskScore >= alertThreshold;
      },

      updateLastNotificationTime: () => set({ lastNotificationTime: Date.now() }),
    }),
    {
      name: 'sentinelops-notifications',
      partialize: (s) => ({
        enabled: s.enabled,
        soundEnabled: s.soundEnabled,
        criticalOnly: s.criticalOnly,
        alertThreshold: s.alertThreshold,
      }),
    }
  )
);

export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return Promise.resolve('unsupported');
  }
  
  if (Notification.permission === 'granted') {
    return Promise.resolve('granted');
  }
  
  if (Notification.permission === 'denied') {
    return Promise.resolve('denied');
  }
  
  return Notification.requestPermission();
}

export function showBrowserNotification(title, body, icon = '/favicon.svg', tag = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const options = {
    body,
    icon,
    badge: '/favicon.svg',
    tag,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  const notification = new Notification(title, options);
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  setTimeout(() => notification.close(), 5000);

  return notification;
}

export function playAlertSound() {
  const audio = new Audio('/alert-sound.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
}

export function notifyAnomaly(anomaly) {
  const { shouldNotify, updateLastNotificationTime, soundEnabled } = useNotificationStore.getState();
  
  if (!shouldNotify(anomaly.riskScore, anomaly.classification)) {
    return;
  }

  const title = anomaly.classification === 'critical' 
    ? '🚨 Critical Threat Detected' 
    : '⚠️ Anomaly Detected';
  
  const body = `${anomaly.threatType || 'Unknown'} | Risk: ${Math.round(anomaly.riskScore * 100)}% | ${anomaly.srcIp || '?'} → ${anomaly.dstIp || '?'}`;
  
  showBrowserNotification(title, body, '/favicon.svg', anomaly._id);
  
  if (soundEnabled) {
    playAlertSound();
  }
  
  updateLastNotificationTime();
}