import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCircle2, RefreshCw, Users, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const statusIcon = (personaCount, avgScore) => {
  if (personaCount === 0) return { label: 'No Personas', cls: 'bg-red-500/10 text-red-400' };
  if (avgScore >= 50) return { label: 'Good', cls: 'bg-green-500/10 text-green-400' };
  return { label: 'Low Match', cls: 'bg-yellow-500/10 text-yellow-400' };
};

export default function PersonasAnalyticsPage() {
  const { token, API_URL } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/personas/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load persona analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const kpiCard = (label, value, sub, color = 'text-white') => (
    <div className="bg-[#0A1628] border border-[#1A2744] rounded-xl p-5">
      <p className="text-[#94A3B8] text-xs mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-[#94A3B8] text-xs mt-1">{sub}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-[#94A3B8] animate-spin" />
      </div>
    );
  }

  const p = data?.platform || {};

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <UserCircle2 className="w-7 h-7 text-[#00A3FF]" />
            Persona Analytics
          </h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">Platform-wide investor persona health across all funds</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1A2744] text-[#94A3B8] hover:text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCard('Total Personas', p.total_personas, 'across all funds', 'text-[#00A3FF]')}
        {kpiCard(
          'Funds with Personas',
          p.funds_with_personas != null ? `${p.funds_with_personas} / ${p.total_funds}` : '—',
          p.funds_with_personas < p.total_funds ? `${p.total_funds - p.funds_with_personas} fund(s) need personas` : 'All funds configured',
          p.funds_with_personas < p.total_funds ? 'text-yellow-400' : 'text-green-400'
        )}
        {kpiCard('Investors Matched ≥50%', p.matched_investors, 'have a strong persona match', 'text-green-400')}
        {kpiCard('Unmatched Investors', p.unmatched_investors, 'no persona match ≥50%', p.unmatched_investors > 0 ? 'text-yellow-400' : 'text-[#94A3B8]')}
      </div>

      {/* Per-Fund Coverage Table */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#94A3B8]" /> Per-Fund Coverage
        </h2>
        <div className="bg-[#0A1628] border border-[#1A2744] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A2744]">
                {['Fund', 'Personas', 'Investors', 'Matched', 'Unmatched', 'Avg Score', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#94A3B8] font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.per_fund || []).map(fund => {
                const s = statusIcon(fund.persona_count, fund.avg_match_score);
                return (
                  <tr key={fund.fund_id} className="border-b border-[#1A2744]/50 hover:bg-[#1A2744]/20">
                    <td className="px-4 py-3 text-white font-medium">{fund.fund_name}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{fund.persona_count}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{fund.investor_count}</td>
                    <td className="px-4 py-3 text-green-400">{fund.matched_count}</td>
                    <td className="px-4 py-3 text-yellow-400">{fund.unmatched_count}</td>
                    <td className="px-4 py-3 text-white">{fund.persona_count > 0 ? `${fund.avg_match_score}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
              {!data?.per_fund?.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A3B8] text-sm">No funds found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Persona Leaderboard */}
        <div>
          <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#94A3B8]" /> Persona Leaderboard
          </h2>
          <div className="space-y-3">
            {(data?.top_personas || []).length === 0 && (
              <p className="text-[#94A3B8] text-sm">No persona matches yet. Create personas and run analysis.</p>
            )}
            {(data?.top_personas || []).map((tp, i) => (
              <div key={tp.persona_id} className="bg-[#0A1628] border border-[#1A2744] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[#94A3B8] text-xs mr-2">#{i + 1}</span>
                    <span className="text-white font-medium text-sm">{tp.persona_name}</span>
                    <span className="text-[#94A3B8] text-xs ml-2">· {tp.fund_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{tp.investor_count} investors</p>
                    <p className="text-[#94A3B8] text-xs">{tp.avg_score}% avg match</p>
                  </div>
                </div>
                <div className="w-full bg-[#1A2744] rounded-full h-1.5">
                  <div
                    className="bg-[#00A3FF] h-1.5 rounded-full"
                    style={{ width: `${Math.min((tp.investor_count / Math.max(...(data?.top_personas || []).map(t => t.investor_count), 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unmatched Investor Breakdown */}
        <div>
          <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" /> Unmatched Investor Pool
          </h2>
          <div className="bg-[#0A1628] border border-[#1A2744] rounded-xl p-4">
            {(data?.unmatched_breakdown || []).length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">All investors matched!</p>
                <p className="text-[#94A3B8] text-xs mt-1">No investors without a persona match ≥50%</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[#94A3B8] text-xs mb-4">
                  Consider creating personas for these investor types to improve coverage:
                </p>
                {data.unmatched_breakdown.map(({ investor_type, count }) => (
                  <div key={investor_type} className="flex items-center justify-between">
                    <span className="text-white text-sm">{investor_type}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-[#1A2744] rounded-full h-1.5">
                        <div
                          className="bg-yellow-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((count / Math.max(...(data?.unmatched_breakdown || []).map(b => b.count), 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-yellow-400 text-sm font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
