import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ExportButton({ params = {}, endpoint = '/anomalies/export', filename = 'export.csv' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={loading} className="btn btn-ghost btn-sm">
      {loading ? '⟳' : '↓'} Export CSV
    </button>
  );
}
