import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Clock, CheckCircle, XCircle, Eye, Download, GitCompare } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../lib/export';
import type { Database as DB } from '../lib/database.types';

type EvalRun = DB['public']['Tables']['eval_runs']['Row'];
type Dataset = DB['public']['Tables']['datasets']['Row'];
type EvalConfig = DB['public']['Tables']['eval_configs']['Row'];

interface EvalRunWithDetails extends EvalRun {
  dataset?: Dataset;
  config?: EvalConfig;
}

export function EvalRuns() {
  const [runs, setRuns] = useState<EvalRunWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRuns, setCompareRuns] = useState<string[]>([]);

  useEffect(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('eval_runs')
        .select('*, datasets(*), eval_configs(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRuns(data as any || []);
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedRun) {
    return <RunResults runId={selectedRun} onBack={() => setSelectedRun(null)} />;
  }

  if (compareMode && compareRuns.length === 2) {
    return (
      <CompareRuns
        runIds={compareRuns}
        onBack={() => {
          setCompareMode(false);
          setCompareRuns([]);
        }}
      />
    );
  }

  const completedRuns = runs.filter((r) => r.status === 'completed');

  const toggleCompareRun = (runId: string) => {
    if (compareRuns.includes(runId)) {
      setCompareRuns(compareRuns.filter((id) => id !== runId));
    } else if (compareRuns.length < 2) {
      setCompareRuns([...compareRuns, runId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Eval Runs</h1>
          <p className="mt-2 text-slate-600">
            Execute and monitor evaluations
          </p>
        </div>
        <div className="flex space-x-2">
          {compareMode && (
            <button
              onClick={() => {
                setCompareMode(false);
                setCompareRuns([]);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel Compare
            </button>
          )}
          {completedRuns.length >= 2 && !compareMode && (
            <button
              onClick={() => setCompareMode(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Runs</span>
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Run Evaluation</span>
          </button>
        </div>
      </div>

      {compareMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Compare Mode</h3>
              <p className="text-sm text-slate-600 mt-1">
                Select 2 completed runs to compare ({compareRuns.length}/2 selected)
              </p>
            </div>
            {compareRuns.length === 2 && (
              <button
                onClick={() => {}}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Comparison
              </button>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateEvalRun
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadRuns();
          }}
        />
      )}

      {runs.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Play className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No eval runs yet</h3>
          <p className="text-slate-600 mb-6">
            Start your first evaluation run
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Run Evaluation</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {runs.map((run) => (
            <div
              key={run.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {compareMode && run.status === 'completed' && (
                  <input
                    type="checkbox"
                    checked={compareRuns.includes(run.id)}
                    onChange={() => toggleCompareRun(run.id)}
                    className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    disabled={!compareRuns.includes(run.id) && compareRuns.length >= 2}
                  />
                )}
                <div className="flex-1 ml-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {run.name || `Run ${new Date(run.created_at).toLocaleString()}`}
                    </h3>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    <div>Dataset: {run.dataset?.name}</div>
                    <div>Config: {run.config?.name}</div>
                  </div>
                  {run.status === 'running' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                        <span>Progress</span>
                        <span>{run.progress} / {run.total_outputs}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(run.progress / run.total_outputs) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {run.status === 'completed' && (
                    <div className="mt-4 flex items-center space-x-6 text-sm text-slate-600">
                      <span>Completed: {new Date(run.completed_at!).toLocaleString()}</span>
                      <span>Cost: ${run.actual_cost.toFixed(4)}</span>
                    </div>
                  )}
                </div>
                {run.status === 'completed' && !compareMode && (
                  <button
                    onClick={() => setSelectedRun(run.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Results</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-slate-100 text-slate-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const icons = {
    pending: Clock,
    running: Play,
    completed: CheckCircle,
    failed: XCircle,
  };

  const Icon = icons[status as keyof typeof icons];

  return (
    <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      <Icon className="w-3 h-3" />
      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </span>
  );
}

interface CreateEvalRunProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEvalRun({ onClose, onSuccess }: CreateEvalRunProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [configs, setConfigs] = useState<EvalConfig[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedConfig, setSelectedConfig] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [datasetsRes, configsRes] = await Promise.all([
        supabase.from('datasets').select('*').order('created_at', { ascending: false }),
        supabase.from('eval_configs').select('*').order('created_at', { ascending: false }),
      ]);

      if (datasetsRes.data) setDatasets(datasetsRes.data);
      if (configsRes.data) setConfigs(configsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset || !selectedConfig) return;

    setCreating(true);

    try {
      const { data: versions, error: versionError } = await supabase
        .from('dataset_versions')
        .select('*')
        .eq('dataset_id', selectedDataset)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) throw versionError;
      if (!versions || versions.length === 0) {
        throw new Error('No dataset version found');
      }

      const latestVersion = versions[0];
      const datasetData = latestVersion.data as any[];

      const { data: run, error: runError } = await supabase
        .from('eval_runs')
        .insert({
          name,
          dataset_id: selectedDataset,
          dataset_version_id: latestVersion.id,
          eval_config_id: selectedConfig,
          status: 'pending',
          progress: 0,
          total_outputs: datasetData.length,
          estimated_cost: datasetData.length * 0.001,
        })
        .select()
        .single();

      if (runError) throw runError;

      executeEvalRun(run.id, selectedConfig, datasetData);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating run:', err);
      alert(err.message || 'Failed to create run');
      setCreating(false);
    }
  };

  const executeEvalRun = async (runId: string, configId: string, datasetData: any[]) => {
    try {
      await supabase
        .from('eval_runs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', runId);

      const { data: config, error: configError } = await supabase
        .from('eval_configs')
        .select('*, metrics(*)')
        .eq('id', configId)
        .single();

      if (configError) throw configError;

      const reviewRate = config.human_review_rate / 100;
      const totalOutputs = datasetData.length;
      const reviewIndices = new Set<number>();

      while (reviewIndices.size < Math.ceil(totalOutputs * reviewRate)) {
        reviewIndices.add(Math.floor(Math.random() * totalOutputs));
      }

      for (let i = 0; i < datasetData.length; i++) {
        const output = datasetData[i];

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-evaluation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              eval_run_id: runId,
              output_data: output,
              output_index: i,
              rubric_prompt: config.rubric_prompt,
              metrics: config.metrics,
              grading_provider: config.grading_provider,
              grading_model: config.grading_model,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to evaluate output');
        }

        if (reviewIndices.has(i)) {
          const { data: result } = await supabase
            .from('eval_results')
            .select('id')
            .eq('eval_run_id', runId)
            .eq('output_index', i)
            .single();

          if (result) {
            await supabase
              .from('eval_results')
              .update({ flagged_for_review: true })
              .eq('id', result.id);
          }
        }

        await supabase
          .from('eval_runs')
          .update({ progress: i + 1 })
          .eq('id', runId);
      }

      await supabase
        .from('eval_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          actual_cost: datasetData.length * 0.001,
        })
        .eq('id', runId);
    } catch (err) {
      console.error('Error executing run:', err);
      await supabase
        .from('eval_runs')
        .update({ status: 'failed' })
        .eq('id', runId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Run Evaluation</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Run Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My evaluation run"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dataset
            </label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a dataset</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.row_count} rows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Eval Config
            </label>
            <select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a config</option>
              {configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {selectedDataset && selectedConfig && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <div className="font-medium mb-1">Ready to run</div>
              <div>
                Estimated cost: $
                {(datasets.find((d) => d.id === selectedDataset)?.row_count || 0) * 0.001}
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={creating || !selectedDataset || !selectedConfig}
            >
              {creating ? 'Starting...' : 'Start Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RunResultsProps {
  runId: string;
  onBack: () => void;
}

function RunResults({ runId, onBack }: RunResultsProps) {
  const [results, setResults] = useState<any[]>([]);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [runId]);

  const loadResults = async () => {
    try {
      const [runRes, resultsRes] = await Promise.all([
        supabase
          .from('eval_runs')
          .select('*, datasets(*), eval_configs(*)')
          .eq('id', runId)
          .single(),
        supabase
          .from('eval_results')
          .select('*')
          .eq('eval_run_id', runId)
          .order('output_index'),
      ]);

      if (runRes.data) setRun(runRes.data);
      if (resultsRes.data) setResults(resultsRes.data);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const avgConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length;

  const handleExport = (format: 'csv' | 'json') => {
    const exportData = results.map((result) => ({
      index: result.output_index,
      prompt: result.prompt,
      output: result.output,
      expected_result: result.expected_result,
      scores: JSON.stringify(result.scores),
      llm_reasoning: result.llm_reasoning,
      confidence_score: result.confidence_score,
      flagged_for_review: result.flagged_for_review,
    }));

    const filename = `eval-results-${runId}-${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      exportToCSV(exportData, `${filename}.csv`);
    } else {
      exportToJSON(exportData, `${filename}.json`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-4"
        >
          ← Back to Runs
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {run.name || 'Eval Run Results'}
            </h1>
            <p className="mt-2 text-slate-600">
              {results.length} outputs evaluated
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Total Outputs</div>
          <div className="text-2xl font-bold text-slate-900">{results.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Avg Confidence</div>
          <div className="text-2xl font-bold text-slate-900">{(avgConfidence * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">For Review</div>
          <div className="text-2xl font-bold text-slate-900">
            {results.filter((r) => r.flagged_for_review).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Index</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Prompt</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Output</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Confidence</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">{result.output_index + 1}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {result.prompt}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {result.output}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {(result.confidence_score * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3">
                    {result.flagged_for_review && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        Flagged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface CompareRunsProps {
  runIds: string[];
  onBack: () => void;
}

function CompareRuns({ runIds, onBack }: CompareRunsProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [results, setResults] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [runIds]);

  const loadData = async () => {
    try {
      const runsData = await Promise.all(
        runIds.map((id) =>
          supabase
            .from('eval_runs')
            .select('*, datasets(*), eval_configs(*)')
            .eq('id', id)
            .single()
        )
      );

      const resultsData = await Promise.all(
        runIds.map((id) =>
          supabase
            .from('eval_results')
            .select('*')
            .eq('eval_run_id', id)
            .order('output_index')
        )
      );

      setRuns(runsData.map((r) => r.data));
      setResults(resultsData.map((r) => r.data || []));
    } catch (error) {
      console.error('Error loading comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const run1 = runs[0];
  const run2 = runs[1];
  const results1 = results[0];
  const results2 = results[1];

  const avgConf1 = results1.reduce((sum, r) => sum + r.confidence_score, 0) / results1.length;
  const avgConf2 = results2.reduce((sum, r) => sum + r.confidence_score, 0) / results2.length;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-4">
          ← Back to Runs
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Compare Eval Runs</h1>
        <p className="mt-2 text-slate-600">Side-by-side comparison of evaluation results</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            {run1.name || 'Run 1'}
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600">Dataset</div>
              <div className="font-medium text-slate-900">{run1.datasets.name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Config</div>
              <div className="font-medium text-slate-900">{run1.eval_configs.name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Total Outputs</div>
              <div className="text-2xl font-bold text-slate-900">{results1.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Avg Confidence</div>
              <div className="text-2xl font-bold text-slate-900">
                {(avgConf1 * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">For Review</div>
              <div className="text-2xl font-bold text-slate-900">
                {results1.filter((r) => r.flagged_for_review).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Cost</div>
              <div className="font-medium text-slate-900">${run1.actual_cost.toFixed(4)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            {run2.name || 'Run 2'}
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600">Dataset</div>
              <div className="font-medium text-slate-900">{run2.datasets.name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Config</div>
              <div className="font-medium text-slate-900">{run2.eval_configs.name}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Total Outputs</div>
              <div className="text-2xl font-bold text-slate-900">{results2.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Avg Confidence</div>
              <div className="text-2xl font-bold text-slate-900">
                {(avgConf2 * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">For Review</div>
              <div className="text-2xl font-bold text-slate-900">
                {results2.filter((r) => r.flagged_for_review).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Cost</div>
              <div className="font-medium text-slate-900">${run2.actual_cost.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Comparison Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Confidence Difference</div>
            <div className={`text-2xl font-bold ${avgConf2 > avgConf1 ? 'text-green-600' : avgConf2 < avgConf1 ? 'text-red-600' : 'text-slate-900'}`}>
              {((avgConf2 - avgConf1) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Cost Difference</div>
            <div className="text-2xl font-bold text-slate-900">
              ${(run2.actual_cost - run1.actual_cost).toFixed(4)}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Review Items Difference</div>
            <div className="text-2xl font-bold text-slate-900">
              {results2.filter((r) => r.flagged_for_review).length -
                results1.filter((r) => r.flagged_for_review).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
