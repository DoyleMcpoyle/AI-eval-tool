import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Key, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface ApiKey {
  id: string;
  provider: 'openai' | 'anthropic';
  api_key: string;
  created_at: string;
  updated_at: string;
}

export function Settings() {
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKey>>({});
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*');

      if (error) throw error;

      const keysMap: Record<string, ApiKey> = {};
      data?.forEach((key) => {
        keysMap[key.provider] = key;
      });
      setApiKeys(keysMap);

      if (keysMap.openai) {
        setOpenaiKey(keysMap.openai.api_key);
      }
      if (keysMap.anthropic) {
        setAnthropicKey(keysMap.anthropic.api_key);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: 'openai' | 'anthropic', key: string) => {
    if (!key.trim()) {
      alert('Please enter an API key');
      return;
    }

    setSaving(provider);
    setSaveSuccess(null);

    try {
      const existingKey = apiKeys[provider];

      if (existingKey) {
        const { error } = await supabase
          .from('api_keys')
          .update({ api_key: key, updated_at: new Date().toISOString() })
          .eq('id', existingKey.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('api_keys')
          .insert({ provider, api_key: key });

        if (error) throw error;
      }

      await loadApiKeys();
      setSaveSuccess(provider);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving API key:', err);
      alert(err.message || 'Failed to save API key');
    } finally {
      setSaving(null);
    }
  };

  const deleteApiKey = async (provider: 'openai' | 'anthropic') => {
    if (!confirm(`Are you sure you want to remove the ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key?`)) {
      return;
    }

    try {
      const existingKey = apiKeys[provider];
      if (!existingKey) return;

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', existingKey.id);

      if (error) throw error;

      if (provider === 'openai') {
        setOpenaiKey('');
      } else {
        setAnthropicKey('');
      }

      await loadApiKeys();
    } catch (err: any) {
      console.error('Error deleting API key:', err);
      alert(err.message || 'Failed to delete API key');
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-600">
          Configure API keys for LLM providers
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Key className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">API Key Configuration</p>
            <p>
              Add at least one API key to run evaluations. You can configure OpenAI, Anthropic, or both depending on which models you want to use.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">OpenAI</h2>
              <p className="text-sm text-slate-600">GPT-4, GPT-3.5 models</p>
            </div>
          </div>

          {apiKeys.openai && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span>API key configured</span>
              </div>
              <div className="mt-1 text-xs text-green-700">
                Last updated: {new Date(apiKeys.openai.updated_at).toLocaleString()}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOpenaiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => saveApiKey('openai', openaiKey)}
                disabled={saving === 'openai'}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saveSuccess === 'openai' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{saving === 'openai' ? 'Saving...' : 'Save Key'}</span>
                  </>
                )}
              </button>
              {apiKeys.openai && (
                <button
                  onClick={() => deleteApiKey('openai')}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenAI Platform
              </a>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Anthropic</h2>
              <p className="text-sm text-slate-600">Claude models</p>
            </div>
          </div>

          {apiKeys.anthropic && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span>API key configured</span>
              </div>
              <div className="mt-1 text-xs text-green-700">
                Last updated: {new Date(apiKeys.anthropic.updated_at).toLocaleString()}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAnthropicKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => saveApiKey('anthropic', anthropicKey)}
                disabled={saving === 'anthropic'}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saveSuccess === 'anthropic' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{saving === 'anthropic' ? 'Saving...' : 'Save Key'}</span>
                  </>
                )}
              </button>
              {apiKeys.anthropic && (
                <button
                  onClick={() => deleteApiKey('anthropic')}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anthropic Console
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-medium text-slate-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>API keys are stored securely in the database</li>
          <li>You only need to configure the providers you plan to use</li>
          <li>Keys are used to grade outputs during evaluation runs</li>
          <li>You can update or remove keys at any time</li>
        </ul>
      </div>
    </div>
  );
}
