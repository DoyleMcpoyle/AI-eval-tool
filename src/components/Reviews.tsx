import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckSquare, ThumbsUp, ThumbsDown, Flag, MessageSquare } from 'lucide-react';
import type { Database as DB } from '../lib/database.types';

type EvalResult = DB['public']['Tables']['eval_results']['Row'];
type HumanReview = DB['public']['Tables']['human_reviews']['Row'];
type Metric = DB['public']['Tables']['metrics']['Row'];

interface ResultWithReviews extends EvalResult {
  human_reviews: HumanReview[];
  metrics?: Metric[];
}

export function Reviews() {
  const [results, setResults] = useState<ResultWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<ResultWithReviews | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('eval_results')
        .select(`
          *,
          human_reviews(*)
        `)
        .eq('flagged_for_review', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data as any || []);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingResults = results.filter((r) => r.human_reviews.length === 0);
  const reviewedResults = results.filter((r) => r.human_reviews.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedResult) {
    return (
      <ReviewInterface
        result={selectedResult}
        onBack={() => {
          setSelectedResult(null);
          loadResults();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Human Reviews</h1>
        <p className="mt-2 text-slate-600">
          Review and validate LLM evaluations
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Pending Reviews</div>
          <div className="text-2xl font-bold text-slate-900">{pendingResults.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Reviewed</div>
          <div className="text-2xl font-bold text-slate-900">{reviewedResults.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Total</div>
          <div className="text-2xl font-bold text-slate-900">{results.length}</div>
        </div>
      </div>

      {pendingResults.length === 0 && reviewedResults.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <CheckSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No reviews needed</h3>
          <p className="text-slate-600">
            Run evaluations to generate outputs for review
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingResults.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Pending Reviews ({pendingResults.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {pendingResults.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    onSelect={() => setSelectedResult(result)}
                  />
                ))}
              </div>
            </div>
          )}

          {reviewedResults.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Reviewed ({reviewedResults.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {reviewedResults.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    onSelect={() => setSelectedResult(result)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ResultCardProps {
  result: ResultWithReviews;
  onSelect: () => void;
}

function ResultCard({ result, onSelect }: ResultCardProps) {
  const reviewCount = result.human_reviews.length;
  const hasDisagreement = result.human_reviews.some((r) => !r.agreement);

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
              Confidence: {(result.confidence_score * 100).toFixed(0)}%
            </span>
            {reviewCount > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            )}
            {hasDisagreement && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center space-x-1">
                <ThumbsDown className="w-3 h-3" />
                <span>Disagreement</span>
              </span>
            )}
          </div>
          <div className="text-sm text-slate-600 mb-2">
            <span className="font-medium">Prompt:</span> {result.prompt.substring(0, 100)}
            {result.prompt.length > 100 && '...'}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium">Output:</span> {result.output.substring(0, 100)}
            {result.output.length > 100 && '...'}
          </div>
        </div>
        <button
          onClick={onSelect}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {reviewCount > 0 ? 'View' : 'Review'}
        </button>
      </div>
    </div>
  );
}

interface ReviewInterfaceProps {
  result: ResultWithReviews;
  onBack: () => void;
}

function ReviewInterface({ result, onBack }: ReviewInterfaceProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [scores, setScores] = useState<Record<string, any>>({});
  const [agreement, setAgreement] = useState(true);
  const [notes, setNotes] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: run } = await supabase
        .from('eval_runs')
        .select('eval_config_id')
        .eq('id', result.eval_run_id)
        .single();

      if (run) {
        const { data: metricsData } = await supabase
          .from('metrics')
          .select('*')
          .eq('eval_config_id', run.eval_config_id);

        if (metricsData) {
          setMetrics(metricsData);
          const initialScores: Record<string, any> = {};
          metricsData.forEach((metric) => {
            initialScores[metric.id] = (result.scores as any)[metric.id];
          });
          setScores(initialScores);
        }
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('human_reviews').insert({
        eval_result_id: result.id,
        reviewer_name: reviewerName,
        scores,
        agreement,
        notes,
        flagged,
      });

      if (error) throw error;
      onBack();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      alert(err.message || 'Failed to submit review');
      setSubmitting(false);
    }
  };

  const llmScores = result.scores as Record<string, any>;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-4">
          ← Back to Reviews
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Review Output</h1>
        <p className="mt-2 text-slate-600">
          Evaluate and provide feedback on this LLM assessment
        </p>
      </div>

      {result.human_reviews.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Existing Reviews</h3>
          <div className="space-y-3">
            {result.human_reviews.map((review) => (
              <div key={review.id} className="bg-white rounded p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{review.reviewer_name}</span>
                  <div className="flex items-center space-x-2">
                    {review.agreement ? (
                      <span className="flex items-center space-x-1 text-green-600">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Agrees</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-red-600">
                        <ThumbsDown className="w-4 h-4" />
                        <span>Disagrees</span>
                      </span>
                    )}
                    {review.flagged && <Flag className="w-4 h-4 text-orange-600" />}
                  </div>
                </div>
                {review.notes && <p className="text-slate-600">{review.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Original Content</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Prompt</h3>
              <div className="bg-slate-50 rounded p-3 text-sm text-slate-700">
                {result.prompt}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Output</h3>
              <div className="bg-slate-50 rounded p-3 text-sm text-slate-700">
                {result.output}
              </div>
            </div>
            {result.expected_result && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Expected Result</h3>
                <div className="bg-slate-50 rounded p-3 text-sm text-slate-700">
                  {result.expected_result}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">LLM Evaluation</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-700">Confidence</h3>
                <span className="text-sm font-semibold text-slate-900">
                  {(result.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${result.confidence_score * 100}%` }}
                />
              </div>
            </div>

            {result.llm_reasoning && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Reasoning</h3>
                <div className="bg-slate-50 rounded p-3 text-sm text-slate-700">
                  {result.llm_reasoning}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Scores</h3>
              <div className="space-y-2">
                {metrics.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm text-slate-700">{metric.name}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {String(llmScores[metric.id] ?? 'N/A')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Review</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Do you agree with the LLM's evaluation?
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setAgreement(true)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  agreement
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
                <span>Agree</span>
              </button>
              <button
                type="button"
                onClick={() => setAgreement(false)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  !agreement
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
                <span>Disagree</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Adjust Scores (optional)
            </label>
            <div className="space-y-3">
              {metrics.map((metric) => (
                <div key={metric.id}>
                  <label className="block text-sm text-slate-600 mb-1">{metric.name}</label>
                  {metric.scoring_type === 'boolean' ? (
                    <select
                      value={String(scores[metric.id])}
                      onChange={(e) =>
                        setScores({ ...scores, [metric.id]: e.target.value === 'true' })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="true">Pass</option>
                      <option value="false">Fail</option>
                    </select>
                  ) : metric.scoring_type === 'numeric' ? (
                    <input
                      type="number"
                      value={scores[metric.id] || ''}
                      onChange={(e) =>
                        setScores({ ...scores, [metric.id]: Number(e.target.value) })
                      }
                      min={(metric.scoring_config as any).min || 1}
                      max={(metric.scoring_config as any).max || 10}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={scores[metric.id] || ''}
                      onChange={(e) => setScores({ ...scores, [metric.id]: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Add any observations or feedback..."
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={flagged}
                onChange={(e) => setFlagged(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Flag this output for attention</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={submitting || !reviewerName}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
