import { useNetworkStatus, usePendingSyncCount } from '../../hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const pendingCount = usePendingSyncCount();

  if (isOnline && !wasOffline) return null;

  return (
    <div className="shrink-0 flex justify-center bg-amber-600 text-white px-4 py-2 border-b border-amber-500">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {isOnline ? 'Reconnecting...' : 'You are offline'}
          </span>
          {pendingCount > 0 && (
            <span className="text-xs opacity-90">
              {pendingCount} operation{pendingCount !== 1 ? 's' : ''} pending sync
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
