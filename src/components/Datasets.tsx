import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Database, Calendar, FileType, Trash2 } from 'lucide-react';
import type { Database as DB } from '../lib/database.types';

type Dataset = DB['public']['Tables']['datasets']['Row'];

export function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatasets(data || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDataset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      const { error } = await supabase.from('datasets').delete().eq('id', id);
      if (error) throw error;
      await loadDatasets();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      alert('Failed to delete dataset');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Datasets</h1>
          <p className="mt-2 text-slate-600">
            Manage your evaluation datasets
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Dataset</span>
        </button>
      </div>

      {showUpload && (
        <UploadDataset
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            loadDatasets();
          }}
        />
      )}

      {datasets.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Database className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No datasets yet</h3>
          <p className="text-slate-600 mb-6">
            Upload your first dataset to get started with evaluations
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{dataset.name}</h3>
                  {dataset.description && (
                    <p className="mt-1 text-sm text-slate-600">{dataset.description}</p>
                  )}
                  <div className="mt-4 flex items-center space-x-6 text-sm text-slate-500">
                    <div className="flex items-center space-x-2">
                      <FileType className="w-4 h-4" />
                      <span>{dataset.format.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>{dataset.row_count} rows</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(dataset.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteDataset(dataset.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface UploadDatasetProps {
  onClose: () => void;
  onSuccess: () => void;
}

function UploadDataset({ onClose, onSuccess }: UploadDatasetProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'json', 'jsonl'].includes(ext || '')) {
        setError('Please upload a CSV, JSON, or JSONL file');
        return;
      }
      setFile(selectedFile);
      setError('');
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      return JSON.parse(text);
    } else if (ext === 'jsonl') {
      return text
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    } else if (ext === 'csv') {
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());
      return lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        return obj;
      });
    }
    return [];
  };

  const validateData = (data: any[]): boolean => {
    if (data.length === 0) {
      setError('Dataset is empty');
      return false;
    }
    const requiredFields = ['prompt', 'output'];
    const firstRow = data[0];
    for (const field of requiredFields) {
      if (!(field in firstRow)) {
        setError(`Missing required field: ${field}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setUploading(true);
    setError('');

    try {
      const data = await parseFile(file);
      if (!validateData(data)) {
        setUploading(false);
        return;
      }

      const format = file.name.split('.').pop()?.toLowerCase() as 'csv' | 'json' | 'jsonl';

      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          name,
          description,
          format,
          row_count: data.length,
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      const { error: versionError } = await supabase
        .from('dataset_versions')
        .insert({
          dataset_id: dataset.id,
          version_number: 1,
          data: data,
        });

      if (versionError) throw versionError;

      onSuccess();
    } catch (err: any) {
      console.error('Error uploading dataset:', err);
      setError(err.message || 'Failed to upload dataset');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Upload Dataset</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dataset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              File (CSV, JSON, or JSONL)
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".csv,.json,.jsonl"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-2 text-xs text-slate-500">
              Required fields: prompt, output. Optional: expected_result, metadata
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={uploading || !file || !name}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
