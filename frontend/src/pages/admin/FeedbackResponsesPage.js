import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  MessageSquareDiff, RefreshCw, ChevronDown, ChevronRight, Star,
  User, Calendar, BarChart2, X, Download
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ScoreBadge = ({ score }) => {
  if (!score) return <span className="text-[#94A3B8]">—</span>;
  const color = score >= 8 ? '#22C55E' : score >= 6 ? '#F59E0B' : '#EF4444';
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-sm" style={{ color }}>
      <Star className="w-3.5 h-3.5" />
      {score}/10
    </span>
  );
};

const Chip = ({ label, color = '#0047AB' }) => (
  <span
    className="inline-block px-2 py-0.5 rounded text-[10px] font-medium mr-1 mb-1"
    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
  >
    {label}
  </span>
);

const FieldRow = ({ label, value }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="py-2 border-b border-[#1A2744] last:border-0">
      <p className="text-[#94A3B8] text-xs mb-1">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1">
          {value.map(v => <Chip key={v} label={v} />)}
        </div>
      ) : (
        <p className="text-white text-sm">{value}</p>
      )}
    </div>
  );
};

// ─── Section display helpers ──────────────────────────────────────────────────

const SECTION_LABELS = {
  s1_role: 'Role',
  s1_capital_frequency: 'Capital frequency',
  s1_current_tools: 'Current tools',
  s2_intuitiveness: 'Intuitiveness (1–10)',
  s2_confusing: 'What felt confusing',
  s2_powerful: 'What felt powerful',
  s2_daily_blocker: 'Daily usage blocker',
  s2_would_miss: 'Would miss platform',
  s2_would_miss_why: 'Why',
  s3_stages_logical: 'Pipeline stages logical?',
  s3_missing_stages: 'Missing stages',
  s3_unnecessary_stages: 'Unnecessary stages',
  s3_expected_auto_tasks: 'Expected auto tasks?',
  s3_tasks_made_sense: 'Auto tasks made sense?',
  s3_task_preference: 'Task preference',
  s3_missing_intro_email: 'Missing: Intro Email tasks',
  s3_missing_first_meeting: 'Missing: First Meeting tasks',
  s3_missing_due_diligence: 'Missing: Due Diligence tasks',
  s3_missing_capital_call: 'Missing: Capital Call tasks',
  s4_system_manual_clear: 'System/manual distinction clear?',
  s4_task_scope: 'Wanted task scope',
  s4_auto_assign_by: 'Auto-assign tasks by',
  s4_priority_clear: 'Priority logic clear?',
  s4_recurring_tasks: 'Want recurring tasks?',
  s5_reflects_reality: 'Capital overview reflects reality?',
  s5_missing_metrics: 'Missing metrics',
  s5_partner_presentation: 'Use for partner presentation?',
  s6_persona_useful: 'Persona scoring useful?',
  s6_wanted_scores: 'Wanted investor scores',
  s6_missing_fields: 'Missing investor fields',
  s7_workflow_clear: 'Chrome capture workflow clear?',
  s7_auto_capture: 'Should auto-capture',
  s7_auto_assign_persona: 'Auto-assign to persona?',
  s8_would_connect_gmail: 'Would connect Gmail?',
  s8_email_automation: 'Email automation desired',
  s8_call_logs_scoring: 'Call logs affect scoring?',
  s9_ai_features: 'Desired AI features',
  s9_automation_comfort: 'Automation comfort level',
  s10_monthly_cost: 'Expected monthly cost',
  s10_replace_excel: 'Would replace Excel?',
  s10_institutional_grade: 'Institutional-grade needs',
  s10_irreplaceable_feature: 'ONE irreplaceable feature',
  s10_unfinished: 'What feels unfinished',
  s11_ranking: 'Priority ranking',
  dev_stage_conversion: 'Stage conversion % built-in?',
  dev_auto_probability: 'Auto-probability by stage?',
  dev_dynamic_forecast: 'Dynamic forecast based on',
};

const SECTIONS_META = [
  { label: 'Section 1: User Context', keys: ['s1_role', 's1_capital_frequency', 's1_current_tools'] },
  { label: 'Section 2: Overall Experience', keys: ['s2_intuitiveness', 's2_confusing', 's2_powerful', 's2_daily_blocker', 's2_would_miss', 's2_would_miss_why'] },
  { label: 'Section 3: Pipeline', keys: ['s3_stages_logical', 's3_missing_stages', 's3_unnecessary_stages', 's3_expected_auto_tasks', 's3_tasks_made_sense', 's3_task_preference', 's3_missing_intro_email', 's3_missing_first_meeting', 's3_missing_due_diligence', 's3_missing_capital_call'] },
  { label: 'Section 4: Task Manager', keys: ['s4_system_manual_clear', 's4_task_scope', 's4_auto_assign_by', 's4_priority_clear', 's4_recurring_tasks'] },
  { label: 'Section 5: Capital Overview', keys: ['s5_reflects_reality', 's5_missing_metrics', 's5_partner_presentation'] },
  { label: 'Section 6: Investor Profiles', keys: ['s6_persona_useful', 's6_wanted_scores', 's6_missing_fields'] },
  { label: 'Section 7: Research Capture', keys: ['s7_workflow_clear', 's7_auto_capture', 's7_auto_assign_persona'] },
  { label: 'Section 8: Communication Center', keys: ['s8_would_connect_gmail', 's8_email_automation', 's8_call_logs_scoring'] },
  { label: 'Section 9: Automation & AI', keys: ['s9_ai_features', 's9_automation_comfort'] },
  { label: 'Section 10: Strategic Questions', keys: ['s10_monthly_cost', 's10_replace_excel', 's10_institutional_grade', 's10_irreplaceable_feature', 's10_unfinished'] },
  { label: 'Section 11: Priorities', keys: ['s11_ranking'] },
  { label: 'Advanced Builder Feedback', keys: ['dev_stage_conversion', 'dev_auto_probability', 'dev_dynamic_forecast'] },
];

// ─── Response detail drawer ───────────────────────────────────────────────────

const ResponseDetail = ({ response, onClose }) => (
  <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl flex flex-col border-l border-[#1A2744]"
    style={{ background: '#0A1628' }}>
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2744] flex-shrink-0">
      <div>
        <p className="text-white font-semibold">{response.user_name || 'Anonymous'}</p>
        <p className="text-[#94A3B8] text-xs">
          {response.user_role} · {formatDate(response.submitted_at)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ScoreBadge score={response.s2_intuitiveness} />
        <button onClick={onClose} className="text-[#94A3B8] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* Scrollable content */}
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {SECTIONS_META.map(section => {
        const hasData = section.keys.some(k => {
          const v = response[k];
          return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
        });
        if (!hasData) return null;
        return (
          <div key={section.label}>
            <p className="text-[#94A3B8] text-xs uppercase tracking-wider font-semibold mb-3">
              {section.label}
            </p>
            <div className="border border-[#1A2744] rounded-xl overflow-hidden">
              {section.keys.map(k => (
                <FieldRow key={k} label={SECTION_LABELS[k]} value={response[k]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Stats bar ────────────────────────────────────────────────────────────────

const StatsBar = ({ responses }) => {
  const total = responses.length;
  const withScore = responses.filter(r => r.s2_intuitiveness);
  const avgScore = withScore.length > 0
    ? (withScore.reduce((s, r) => s + r.s2_intuitiveness, 0) / withScore.length).toFixed(1)
    : null;

  const roleCounts = responses.reduce((acc, r) => {
    if (r.s1_role) acc[r.s1_role] = (acc[r.s1_role] || 0) + 1;
    return acc;
  }, {});
  const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0];

  const wantAI = responses.filter(r => r.s9_ai_features?.length > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total responses', value: total, icon: MessageSquareDiff, color: '#0047AB' },
        { label: 'Avg intuitiveness', value: avgScore ? `${avgScore}/10` : '—', icon: Star, color: '#F59E0B' },
        { label: 'Most common role', value: topRole ? `${topRole[0].split(' ')[0]} (${topRole[1]})` : '—', icon: User, color: '#10B981' },
        { label: 'Want AI features', value: wantAI > 0 ? `${wantAI} / ${total}` : '—', icon: BarChart2, color: '#8B5CF6' },
      ].map(stat => (
        <div key={stat.label} className="border border-[#1A2744] rounded-xl p-4 bg-[#0A1628]/60">
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            <p className="text-[#94A3B8] text-xs">{stat.label}</p>
          </div>
          <p className="text-white text-xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const FeedbackResponsesPage = () => {
  const { token, API_URL } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResponses(res.data.responses || []);
    } catch {
      toast.error('Failed to load feedback responses');
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const roles = ['All', ...Array.from(new Set(responses.map(r => r.s1_role).filter(Boolean)))];

  const filtered = responses.filter(r => {
    const matchRole = filterRole === 'All' || r.s1_role === filterRole;
    const matchSearch = !search || (r.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.s1_role || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Submitted', 'Intuitiveness', 'Would Miss', 'Irreplaceable Feature'];
    const rows = responses.map(r => [
      r.user_name || '',
      r.user_email || '',
      r.s1_role || '',
      formatDate(r.submitted_at),
      r.s2_intuitiveness || '',
      r.s2_would_miss || '',
      r.s10_irreplaceable_feature || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alknz-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="feedback-responses-page">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquareDiff className="w-6 h-6 text-[#0047AB]" />
            User Testing Feedback
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            {responses.length} response{responses.length !== 1 ? 's' : ''} collected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={responses.length === 0}
            className="border-[#1A2744] text-[#94A3B8] hover:bg-[#1A2744] hover:text-white text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResponses}
            className="border-[#1A2744] text-[#94A3B8] hover:bg-[#1A2744] hover:text-white text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {responses.length > 0 && <StatsBar responses={responses} />}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search by name, email, role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {roles.map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterRole === role
                  ? 'bg-[#0047AB] text-white'
                  : 'bg-[#1A2744]/50 text-[#94A3B8] hover:text-white hover:bg-[#1A2744]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Responses table */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-[#94A3B8] text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading responses...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center border border-[#1A2744] rounded-xl">
          <MessageSquareDiff className="w-10 h-10 text-[#1A2744] mb-3" />
          <p className="text-white font-medium text-sm">No responses yet</p>
          <p className="text-[#94A3B8] text-xs mt-1">
            Share the feedback link with your team and test users.
          </p>
        </div>
      ) : (
        <div className="border border-[#1A2744] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#02040A]/60 border-b border-[#1A2744]">
            <div className="col-span-3 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Respondent</div>
            <div className="col-span-2 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Role</div>
            <div className="col-span-2 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Score</div>
            <div className="col-span-2 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Would Miss?</div>
            <div className="col-span-2 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          {filtered.map((r) => (
            <div key={r.id} className="border-b border-[#1A2744] last:border-0">
              {/* Main row */}
              <div
                className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-[#0047AB]/5 transition-colors cursor-pointer items-center"
                onClick={() => toggleRow(r.id)}
              >
                <div className="col-span-3">
                  <p className="text-white text-sm font-medium truncate">{r.user_name || 'Anonymous'}</p>
                  <p className="text-[#94A3B8] text-xs truncate">{r.user_email}</p>
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-[#1A2744] text-[#94A3B8]">
                    {r.s1_role || r.user_role || '—'}
                  </span>
                </div>
                <div className="col-span-2">
                  <ScoreBadge score={r.s2_intuitiveness} />
                </div>
                <div className="col-span-2 text-sm">
                  {r.s2_would_miss
                    ? <span className={r.s2_would_miss === 'Yes' ? 'text-[#22C55E]' : r.s2_would_miss === 'No' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}>{r.s2_would_miss}</span>
                    : <span className="text-[#94A3B8]">—</span>
                  }
                </div>
                <div className="col-span-2 text-[#94A3B8] text-xs">{formatDate(r.submitted_at)}</div>
                <div className="col-span-1 flex justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedResponse(r); }}
                    className="p-1.5 rounded hover:bg-[#0047AB]/20 text-[#94A3B8] hover:text-[#00A3FF] transition-colors text-xs"
                    title="View full response"
                  >
                    View
                  </button>
                  {expandedRows.has(r.id)
                    ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                    : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                  }
                </div>
              </div>

              {/* Expanded preview */}
              {expandedRows.has(r.id) && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-4 bg-[#02040A]/30">
                  {r.s2_confusing && (
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-1">What felt confusing</p>
                      <p className="text-white text-sm">{r.s2_confusing}</p>
                    </div>
                  )}
                  {r.s2_powerful && (
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-1">What felt powerful</p>
                      <p className="text-white text-sm">{r.s2_powerful}</p>
                    </div>
                  )}
                  {r.s10_irreplaceable_feature && (
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-1">ONE irreplaceable feature</p>
                      <p className="text-white text-sm">{r.s10_irreplaceable_feature}</p>
                    </div>
                  )}
                  {r.s10_unfinished && (
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-1">What feels unfinished</p>
                      <p className="text-white text-sm">{r.s10_unfinished}</p>
                    </div>
                  )}
                  {r.s9_ai_features?.length > 0 && (
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-1">AI features wanted</p>
                      <div className="flex flex-wrap gap-1">
                        {r.s9_ai_features.map(f => <Chip key={f} label={f} color="#8B5CF6" />)}
                      </div>
                    </div>
                  )}
                  {r.s11_ranking?.length > 0 && (
                    <div>
                      <p className="text-[#94A3B8] text-xs mb-1">Priority #1</p>
                      <p className="text-white text-sm font-medium">{r.s11_ranking[0]}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedResponse && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedResponse(null)} />
          <ResponseDetail response={selectedResponse} onClose={() => setSelectedResponse(null)} />
        </>
      )}
    </div>
  );
};

export default FeedbackResponsesPage;
