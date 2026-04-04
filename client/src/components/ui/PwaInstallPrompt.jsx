import { useState, useEffect } from 'react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 text-white p-4 rounded-lg shadow-xl z-50 border border-slate-700">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">Install SentinelOps</h4>
          <p className="text-xs text-slate-300 mt-1">Add to your home screen for quick access and offline support</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleInstall}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded-md transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
