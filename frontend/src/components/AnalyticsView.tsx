import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie
} from 'recharts';
import { 
  ArrowLeft, Scale, Award, AlertTriangle, Shield, CheckCircle2, 
  BarChart3, RefreshCw, Zap
} from 'lucide-react';

interface AnalyticsViewProps {
  onBack: () => void;
}

interface AnalyticsData {
  win_rates: {
    for: number;
    against: number;
    total: number;
  };
  strength_trends: {
    round_number: number;
    side: 'for' | 'against';
    avg_score: number;
  }[];
  bias_stats: {
    total_audits: number;
    bias_count: number;
    bias_rate: number;
  };
  categories: {
    Tech: number;
    Ethics: number;
    Science: number;
    Politics: number;
    Philosophy: number;
  };
  api_budget: {
    total_calls: number;
    calls_today: number;
  };
}

export default function AnalyticsView({ onBack }: AnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/debate/analytics');
      if (!res.ok) {
        throw new Error('Failed to load analytics data.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format Recharts data
  const getWinRateData = () => {
    if (!data) return [];
    return [
      { name: 'Side A (FOR)', value: data.win_rates.for, color: '#3b82f6' },
      { name: 'Side B (AGAINST)', value: data.win_rates.against, color: '#a855f7' }
    ];
  };

  const getStrengthData = () => {
    if (!data) return [];
    // Group trends by round_number
    const rounds: { [key: number]: { round: string; SideA?: number; SideB?: number } } = {};
    data.strength_trends.forEach(t => {
      const rn = t.round_number;
      if (!rounds[rn]) {
        rounds[rn] = { round: `Round ${rn}` };
      }
      if (t.side === 'for') {
        rounds[rn].SideA = parseFloat(t.avg_score.toFixed(2));
      } else {
        rounds[rn].SideB = parseFloat(t.avg_score.toFixed(2));
      }
    });
    return Object.keys(rounds).map(k => rounds[parseInt(k)]);
  };

  const getCategoryData = () => {
    if (!data) return [];
    return Object.entries(data.categories).map(([name, count]) => ({
      name,
      count
    }));
  };

  return (
    <div id="analytics-screen-container" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-paper select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            id="analytics-back-btn"
            onClick={onBack}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-blue-400 font-bold">Research Dashboard</span>
            <h1 className="font-sans text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2 mt-0.5">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Cross-Debate Analytics
            </h1>
          </div>
        </div>

        <button
          id="refresh-analytics-btn"
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-48 shimmer rounded-2xl" />
          <div className="h-48 shimmer rounded-2xl" />
          <div className="h-48 shimmer rounded-2xl" />
          <div className="col-span-1 md:col-span-2 h-80 shimmer rounded-2xl" />
          <div className="h-80 shimmer rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-12 text-center border border-dashed border-neutral-850 rounded-2xl max-w-md mx-auto space-y-3 bg-neutral-900/30">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-sans text-sm font-bold text-zinc-200">Failed to load analytics</h3>
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Debates */}
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Total Debates</span>
                <h3 className="font-mono text-2xl font-black text-white mt-1">{data.win_rates.total}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Scale className="w-5 h-5" />
              </div>
            </div>

            {/* Quota audited */}
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Bias Audits Run</span>
                <h3 className="font-mono text-2xl font-black text-white mt-1">{data.bias_stats.total_audits}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            {/* Bias Flip Rate */}
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Bias Detected Rate</span>
                <h3 className="font-mono text-2xl font-black text-white mt-1">{data.bias_stats.bias_rate}%</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* API Calls Today */}
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Gemini API Calls Today</span>
                <h3 className="font-mono text-2xl font-black text-white mt-1">
                  {data.api_budget.calls_today}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Win rates bar chart (5 cols) */}
            <div className="lg:col-span-5 glass-panel p-5 rounded-2xl flex flex-col h-80">
              <h3 className="font-sans text-xs font-bold text-zinc-200 mb-4 uppercase tracking-wider">Side A (FOR) vs Side B (AGAINST) Win Rate</h3>
              <div className="flex-1 w-full text-xs">
                {data.win_rates.total === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-neutral-500 italic">No debate results recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWinRateData()} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" />
                      <YAxis stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#f4f4f5' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {getWinRateData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Average score trend (7 cols) */}
            <div className="lg:col-span-7 glass-panel p-5 rounded-2xl flex flex-col h-80">
              <h3 className="font-sans text-xs font-bold text-zinc-200 mb-4 uppercase tracking-wider">Average Turn Strength Score Trend</h3>
              <div className="flex-1 w-full text-xs">
                {data.strength_trends.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-neutral-500 italic">No turns analyzed.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getStrengthData()} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                      <XAxis dataKey="round" stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" />
                      <YAxis domain={[6, 10]} stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#f4f4f5' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                      <Line type="monotone" dataKey="SideA" stroke="#3b82f6" strokeWidth={3} name="Side A (FOR)" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="SideB" stroke="#a855f7" strokeWidth={3} name="Side B (AGAINST)" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topic Frequency Distribution */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col h-80">
              <h3 className="font-sans text-xs font-bold text-zinc-200 mb-4 uppercase tracking-wider">Most-Debated Topics by Category</h3>
              <div className="flex-1 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCategoryData()} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                    <XAxis type="number" stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={10} fontFamily="Outfit" width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#f4f4f5' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bias report info panel */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-80">
              <div>
                <h3 className="font-sans text-xs font-bold text-zinc-200 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Order-Swap Bias Auditor Analytics
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                  In completed debates, swapping presentation sequence and label parameters triggers our position-bias checks.
                </p>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Total Audited Debates:</span>
                  <span className="font-mono text-zinc-200 font-bold">{data.bias_stats.total_audits}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Verdict Order flips (Bias):</span>
                  <span className="font-mono text-rose-400 font-bold">{data.bias_stats.bias_count}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-900">
                  <span className="font-bold text-zinc-300">Neutrality Consistency:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {data.bias_stats.total_audits > 0 
                      ? `${round(100 - data.bias_stats.bias_rate, 1)}%` 
                      : '100%'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 leading-normal flex items-center gap-1.5 bg-neutral-900/50 p-2.5 rounded-lg">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <span>Verdict flips represent position sensitivity, highlighting systemic LLM evaluation characteristics.</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function round(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals));
}
