import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#0F1623',
          color: '#E8EDF5',
          border: '1px solid rgba(255,255,255,0.08)',
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: '13px',
          borderRadius: '0',
        },
        success: { iconTheme: { primary: '#10B981', secondary: '#0F1623' } },
        error:   { iconTheme: { primary: '#FF4444', secondary: '#0F1623' } },
      }}
    />
  </React.StrictMode>
);
