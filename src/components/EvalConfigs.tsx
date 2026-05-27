import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, FileText, Trash2, Edit, Sparkles } from 'lucide-react';
import type { Database as DB } from '../lib/database.types';

type EvalConfig = DB['public']['Tables']['eval_configs']['Row'];
type Metric = DB['public']['Tables']['metrics']['Row'];
type Template = DB['public']['Tables']['suggested_templates']['Row'];

export function EvalConfigs() {
  const [configs, setConfigs] = useState<EvalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('eval_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this eval config?')) return;

    try {
      const { error } = await supabase.from('eval_configs').delete().eq('id', id);
      if (error) throw error;
      await loadConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete config');
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
          <h1 className="text-3xl font-bold text-slate-900">Eval Configs</h1>
          <p className="mt-2 text-slate-600">
            Define evaluation criteria and metrics
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Config</span>
        </button>
      </div>

      {showCreate && (
        <CreateEvalConfig
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadConfigs();
          }}
        />
      )}

      {configs.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No eval configs yet</h3>
          <p className="text-slate-600 mb-6">
            Create your first eval config to start evaluating outputs
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Config</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              onDelete={deleteConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ConfigCardProps {
  config: EvalConfig;
  onDelete: (id: string) => void;
}

function ConfigCard({ config, onDelete }: ConfigCardProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMetrics = async () => {
    if (metrics.length > 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('eval_config_id', config.id);

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadMetrics();
    }
  }, [expanded]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{config.name}</h3>
            {config.description && (
              <p className="mt-1 text-sm text-slate-600">{config.description}</p>
            )}
            <div className="mt-4 flex items-center space-x-6 text-sm text-slate-500">
              <span>
                Model: {config.grading_provider === 'openai' ? 'OpenAI' : 'Anthropic'} -{' '}
                {config.grading_model}
              </span>
              <span>Review Rate: {config.human_review_rate}%</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              {expanded ? 'Hide Details' : 'Show Details'}
            </button>
            <button
              onClick={() => onDelete(config.id)}
              className="text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Rubric Prompt</h4>
            <div className="bg-white border border-slate-200 rounded p-3 text-sm text-slate-600">
              {config.rubric_prompt}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Metrics</h4>
            {loading ? (
              <div className="text-sm text-slate-500">Loading metrics...</div>
            ) : metrics.length === 0 ? (
              <div className="text-sm text-slate-500">No metrics defined</div>
            ) : (
              <div className="space-y-2">
                {metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="bg-white border border-slate-200 rounded p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-900">{metric.name}</span>
                        <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {metric.scoring_type}
                        </span>
                      </div>
                    </div>
                    {metric.description && (
                      <p className="mt-1 text-sm text-slate-600">{metric.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateEvalConfigProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEvalConfig({ onClose, onSuccess }: CreateEvalConfigProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rubricPrompt, setRubricPrompt] = useState('');
  const [gradingModel, setGradingModel] = useState('gpt-4o');
  const [gradingProvider, setGradingProvider] = useState<'openai' | 'anthropic'>('openai');
  const [humanReviewRate, setHumanReviewRate] = useState(10);
  const [metrics, setMetrics] = useState<Array<{
    name: string;
    description: string;
    scoring_type: 'boolean' | 'numeric' | 'categorical';
    scoring_config: any;
  }>>([]);
  const [creating, setCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
    loadAvailableProviders();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('suggested_templates')
        .select('*')
        .order('category');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadAvailableProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('provider');

      if (error) throw error;
      const providers = data?.map((k) => k.provider) || [];
      setAvailableProviders(providers);

      if (providers.length > 0 && !providers.includes('openai')) {
        setGradingProvider('anthropic');
        setGradingModel('claude-3-5-sonnet-20241022');
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const addMetric = () => {
    setMetrics([
      ...metrics,
      {
        name: '',
        description: '',
        scoring_type: 'boolean',
        scoring_config: {},
      },
    ]);
  };

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, field: string, value: any) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };
    setMetrics(updated);
  };

  const applyTemplate = (template: Template) => {
    const content = template.content as any;
    if (template.type === 'rubric') {
      setRubricPrompt(content.prompt);
    } else if (template.type === 'metric') {
      setMetrics([
        ...metrics,
        {
          name: content.name,
          description: content.description,
          scoring_type: content.scoring_type,
          scoring_config: content.scoring_config || {},
        },
      ]);
    }
    setShowTemplates(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rubricPrompt || metrics.length === 0) return;

    setCreating(true);

    try {
      const { data: config, error: configError } = await supabase
        .from('eval_configs')
        .insert({
          name,
          description,
          rubric_prompt: rubricPrompt,
          grading_model: gradingModel,
          grading_provider: gradingProvider,
          human_review_rate: humanReviewRate,
        })
        .select()
        .single();

      if (configError) throw configError;

      const metricsToInsert = metrics.map((metric) => ({
        eval_config_id: config.id,
        name: metric.name,
        description: metric.description,
        scoring_type: metric.scoring_type,
        scoring_config: metric.scoring_config,
      }));

      const { error: metricsError } = await supabase
        .from('metrics')
        .insert(metricsToInsert);

      if (metricsError) throw metricsError;

      onSuccess();
    } catch (err: any) {
      console.error('Error creating config:', err);
      alert(err.message || 'Failed to create config');
      setCreating(false);
    }
  };

  const openAIModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
  const anthropicModels = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Create Eval Config</h2>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Sparkles className="w-4 h-4" />
            <span>Browse Templates</span>
          </button>
        </div>

        {showTemplates && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-3">Suggested Templates</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Rubrics</h4>
                <div className="grid grid-cols-2 gap-2">
                  {templates
                    .filter((t) => t.type === 'rubric')
                    .map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="text-left p-2 bg-white border border-slate-200 rounded hover:border-blue-300 text-sm"
                      >
                        <div className="font-medium text-slate-900">{template.name}</div>
                        <div className="text-xs text-slate-600">{template.description}</div>
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Metrics</h4>
                <div className="grid grid-cols-2 gap-2">
                  {templates
                    .filter((t) => t.type === 'metric')
                    .map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="text-left p-2 bg-white border border-slate-200 rounded hover:border-blue-300 text-sm"
                      >
                        <div className="font-medium text-slate-900">{template.name}</div>
                        <div className="text-xs text-slate-600">{template.description}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {availableProviders.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-sm text-yellow-900">
                <p className="font-medium mb-1">No API Keys Configured</p>
                <p>
                  You need to configure at least one API key before creating an eval config. Please go to Settings to add your OpenAI or Anthropic API key.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Config Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={availableProviders.length === 0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Human Review Rate (%)
              </label>
              <input
                type="number"
                value={humanReviewRate}
                onChange={(e) => setHumanReviewRate(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={availableProviders.length === 0}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rubric Prompt
            </label>
            <textarea
              value={rubricPrompt}
              onChange={(e) => setRubricPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Enter instructions for how the LLM should evaluate outputs..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Provider
              </label>
              <select
                value={gradingProvider}
                onChange={(e) => {
                  setGradingProvider(e.target.value as 'openai' | 'anthropic');
                  setGradingModel(e.target.value === 'openai' ? openAIModels[0] : anthropicModels[0]);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={availableProviders.length === 0}
              >
                {availableProviders.includes('openai') && <option value="openai">OpenAI</option>}
                {availableProviders.includes('anthropic') && <option value="anthropic">Anthropic</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Grading Model
              </label>
              <select
                value={gradingModel}
                onChange={(e) => setGradingModel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={availableProviders.length === 0}
              >
                {(gradingProvider === 'openai' ? openAIModels : anthropicModels).map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Metrics
              </label>
              <button
                type="button"
                onClick={addMetric}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Metric</span>
              </button>
            </div>

            {metrics.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-300 rounded-lg">
                No metrics added. Click "Add Metric" or use templates.
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.map((metric, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={metric.name}
                          onChange={(e) => updateMetric(index, 'name', e.target.value)}
                          placeholder="Metric name"
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          required
                        />
                        <select
                          value={metric.scoring_type}
                          onChange={(e) => updateMetric(index, 'scoring_type', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          <option value="boolean">Boolean (Pass/Fail)</option>
                          <option value="numeric">Numeric Scale</option>
                          <option value="categorical">Categorical</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMetric(index)}
                        className="ml-2 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={metric.description}
                      onChange={(e) => updateMetric(index, 'description', e.target.value)}
                      placeholder="Metric description"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    {metric.scoring_type === 'numeric' && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min (e.g., 1)"
                          onChange={(e) =>
                            updateMetric(index, 'scoring_config', {
                              ...metric.scoring_config,
                              min: Number(e.target.value),
                            })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Max (e.g., 5)"
                          onChange={(e) =>
                            updateMetric(index, 'scoring_config', {
                              ...metric.scoring_config,
                              max: Number(e.target.value),
                            })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
              disabled={creating || !name || !rubricPrompt || metrics.length === 0}
            >
              {creating ? 'Creating...' : 'Create Config'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
