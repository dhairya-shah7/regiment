import { useEffect, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import UploadDropzone from '../components/ui/UploadDropzone';
import DataTable from '../components/ui/DataTable';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const SOURCE_OPTIONS = ['UNSW-NB15', 'NSL-KDD', 'CICIDS'];

const STATUS_BADGE = {
  ready:      'bg-success-dim text-success border-success/20',
  processing: 'bg-warning-dim text-warning border-warning/20',
  uploading:  'bg-accent-dim text-accent border-accent/20',
  error:      'bg-alert-dim text-alert border-alert/20',
};

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [source, setSource] = useState('UNSW-NB15');
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchDatasets = async () => {
    try {
      const res = await api.get('/dataset');
      setDatasets(res.data.datasets);
    } catch { toast.error('Failed to load datasets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDatasets(); }, []);

  const handleUpload = async () => {
    if (!file) return toast.error('Select a CSV file first');
    const form = new FormData();
    form.append('file', file);
    form.append('source', source);
    form.append('name', name || file.name);
    setUploading(true);
    try {
      await api.post('/dataset/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Dataset uploaded successfully');
      setFile(null);
      setName('');
      fetchDatasets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/dataset/${deleteTarget._id}`);
      toast.success('Dataset deleted');
      setDeleteTarget(null);
      fetchDatasets();
    } catch { toast.error('Delete failed'); }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'source', label: 'Source', render: (v) => <span className="font-mono text-accent">{v}</span> },
    { key: 'recordCount', label: 'Records', render: (v) => v?.toLocaleString() || '—' },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`px-2 py-0.5 text-xs font-mono border ${STATUS_BADGE[v] || STATUS_BADGE.error}`}>{v}</span>
    )},
    { key: 'createdAt', label: 'Uploaded', render: (v) => v ? formatDistanceToNow(new Date(v), { addSuffix: true }) : '—' },
    { key: 'uploadedBy', label: 'By', render: (v) => v?.username || '—' },
    { key: '_id', label: '', sortable: false, render: (_, row) => (
      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} className="btn btn-danger btn-sm">Delete</button>
    )},
  ];

  return (
    <PageWrapper title="/ datasets / manage">
      <div className="space-y-5">
        {/* Upload */}
        <div className="card corner-accent">
          <p className="section-title mb-4">Upload New Dataset</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="input-label">Dataset Source</label>
              <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
                {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Display Name (optional)</label>
              <input className="input" placeholder="e.g. UNSW Training Set 2024" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <UploadDropzone onFile={setFile} loading={uploading} />
          <div className="flex justify-end mt-4">
            <button onClick={handleUpload} disabled={!file || uploading} className="btn btn-primary">
              {uploading ? '⟳ Uploading...' : '↑ Upload Dataset'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Uploaded Datasets ({datasets.length})</p>
            <button onClick={fetchDatasets} className="btn btn-ghost btn-sm">↺ Refresh</button>
          </div>
          <DataTable
            columns={columns}
            data={datasets}
            loading={loading}
            emptyMessage="No datasets uploaded yet. Use the upload panel above."
          />
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Dataset"
        message={`Delete "${deleteTarget?.name}"? This will remove the dataset and all associated traffic records. This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  );
}
