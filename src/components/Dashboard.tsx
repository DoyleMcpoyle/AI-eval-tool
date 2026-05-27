import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database, FileText, Play, CheckSquare, TrendingUp } from 'lucide-react';

interface Stats {
  totalDatasets: number;
  totalConfigs: number;
  totalRuns: number;
  pendingReviews: number;
}

interface DashboardProps {
  onNavigate: (view: 'datasets' | 'configs' | 'runs' | 'reviews') => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalDatasets: 0,
    totalConfigs: 0,
    totalRuns: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [datasets, configs, runs, reviews] = await Promise.all([
        supabase.from('datasets').select('id', { count: 'exact', head: true }),
        supabase.from('eval_configs').select('id', { count: 'exact', head: true }),
        supabase.from('eval_runs').select('id', { count: 'exact', head: true }),
        supabase
          .from('eval_results')
          .select('id', { count: 'exact', head: true })
          .eq('flagged_for_review', true)
          .not('id', 'in',
            supabase.from('human_reviews').select('eval_result_id')
          ),
      ]);

      setStats({
        totalDatasets: datasets.count || 0,
        totalConfigs: configs.count || 0,
        totalRuns: runs.count || 0,
        pendingReviews: reviews.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Datasets',
      value: stats.totalDatasets,
      icon: Database,
      color: 'bg-blue-500',
      action: () => onNavigate('datasets'),
    },
    {
      label: 'Eval Configs',
      value: stats.totalConfigs,
      icon: FileText,
      color: 'bg-green-500',
      action: () => onNavigate('configs'),
    },
    {
      label: 'Eval Runs',
      value: stats.totalRuns,
      icon: Play,
      color: 'bg-purple-500',
      action: () => onNavigate('runs'),
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: CheckSquare,
      color: 'bg-orange-500',
      action: () => onNavigate('reviews'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Overview of your AI evaluation projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={card.action}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-900">Quick Start</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Upload a Dataset</h3>
              <p className="text-sm text-slate-600 mt-1">
                Start by uploading your prompts and model outputs in CSV, JSON, or JSONL format
              </p>
              <button
                onClick={() => onNavigate('datasets')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Datasets →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Create an Eval Config</h3>
              <p className="text-sm text-slate-600 mt-1">
                Define your rubric, metrics, and grading model to evaluate outputs
              </p>
              <button
                onClick={() => onNavigate('configs')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Eval Configs →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Run Evaluation</h3>
              <p className="text-sm text-slate-600 mt-1">
                Execute your eval and let the LLM grade your outputs automatically
              </p>
              <button
                onClick={() => onNavigate('runs')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Eval Runs →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold flex-shrink-0">
              4
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Review Results</h3>
              <p className="text-sm text-slate-600 mt-1">
                Add human spot checks to validate LLM grading and ensure reliability
              </p>
              <button
                onClick={() => onNavigate('reviews')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Reviews →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
