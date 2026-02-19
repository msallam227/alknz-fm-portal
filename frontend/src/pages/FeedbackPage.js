import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  User, Star, GitBranch, ClipboardList, BarChart2, Users, Search,
  MessageSquare, Zap, Target, LayoutGrid, Code2, ChevronLeft,
  ChevronRight, CheckCircle2, ChevronUp, ChevronDown, ArrowLeft, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const LOGO_URL = "https://cdn.prod.website-files.com/66c1ff66234911f96b0e0367/66d5ccad639d4c3a5079e64e_ALKNZ_Main%20logo.svg";

const SECTIONS = [
  { num: 1, title: 'User Context', icon: User, color: '#0047AB' },
  { num: 2, title: 'Overall Platform Experience', icon: Star, color: '#8B5CF6' },
  { num: 3, title: 'Fundraising Pipeline', icon: GitBranch, color: '#10B981' },
  { num: 4, title: 'Task Manager', icon: ClipboardList, color: '#F59E0B' },
  { num: 5, title: 'Capital Overview', icon: BarChart2, color: '#EF4444' },
  { num: 6, title: 'Investor Profiles', icon: Users, color: '#00A3FF' },
  { num: 7, title: 'Research Capture', icon: Search, color: '#EC4899' },
  { num: 8, title: 'Communication Center', icon: MessageSquare, color: '#06B6D4' },
  { num: 9, title: 'Automation & AI', icon: Zap, color: '#F97316' },
  { num: 10, title: 'Strategic Questions', icon: Target, color: '#84CC16' },
  { num: 11, title: 'Developmental Priorities', icon: LayoutGrid, color: '#A855F7' },
  { num: 12, title: 'Advanced Builder Feedback', icon: Code2, color: '#94A3B8', optional: true },
];

// ─── Reusable form primitives ────────────────────────────────────────────────

const Radio = ({ value, selected, onSelect, label }) => (
  <button
    onClick={() => onSelect(value)}
    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border transition-all ${
      selected
        ? 'border-[#0047AB] bg-[#0047AB]/10 text-white'
        : 'border-[#1A2744] hover:border-[#0047AB]/50 text-[#94A3B8] hover:text-white'
    }`}
  >
    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
      selected ? 'border-[#0047AB] bg-[#0047AB]' : 'border-[#94A3B8]'
    }`}>
      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
    <span className="text-sm">{label}</span>
  </button>
);

const Checkbox = ({ value, checked, onToggle, label }) => (
  <button
    onClick={() => onToggle(value)}
    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border transition-all ${
      checked
        ? 'border-[#0047AB] bg-[#0047AB]/10 text-white'
        : 'border-[#1A2744] hover:border-[#0047AB]/50 text-[#94A3B8] hover:text-white'
    }`}
  >
    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
      checked ? 'border-[#0047AB] bg-[#0047AB]' : 'border-[#94A3B8]'
    }`}>
      {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
    </div>
    <span className="text-sm">{label}</span>
  </button>
);

const ScoreSelector = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-all ${
          value === n
            ? 'border-[#0047AB] bg-[#0047AB] text-white'
            : 'border-[#1A2744] text-[#94A3B8] hover:border-[#0047AB]/50 hover:text-white'
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);

const OpenText = ({ value, onChange, placeholder, rows = 3 }) => (
  <Textarea
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className="bg-[#02040A]/80 border-[#1A2744] text-white placeholder:text-[#94A3B8]/50 text-sm resize-none"
  />
);

const Q = ({ label, children }) => (
  <div className="space-y-3">
    <p className="text-white font-medium text-sm leading-relaxed">{label}</p>
    {children}
  </div>
);

const SubLabel = ({ children }) => (
  <p className="text-[#94A3B8] text-xs uppercase tracking-wider font-semibold mt-2">{children}</p>
);

// ─── Section renderers ────────────────────────────────────────────────────────

const Section1 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="What is your role?">
      {['Fund Manager', 'Investment Analyst', 'Founder raising capital', 'Family Office Representative', 'Institutional Investor', 'Other'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s1_role === opt} onSelect={v => setField('s1_role', v)} label={opt} />
      ))}
    </Q>
    <Q label="How often do you raise or manage capital?">
      {['First time', 'Occasionally', 'Regularly', 'Professionally full-time'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s1_capital_frequency === opt} onSelect={v => setField('s1_capital_frequency', v)} label={opt} />
      ))}
    </Q>
    <Q label="What tools do you currently use? (Select all that apply)">
      {['Excel', 'Affinity', 'Salesforce', 'HubSpot', 'Carta', 'None', 'Other'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s1_current_tools || []).includes(opt)} onToggle={v => toggleInArray('s1_current_tools', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section2 = ({ data, setField }) => (
  <div className="space-y-6">
    <Q label="On a scale of 1–10, how intuitive is the platform?">
      <ScoreSelector value={data.s2_intuitiveness} onChange={v => setField('s2_intuitiveness', v)} />
    </Q>
    <Q label="What felt confusing?">
      <OpenText value={data.s2_confusing} onChange={v => setField('s2_confusing', v)} placeholder="Describe anything that was unclear or hard to find..." />
    </Q>
    <Q label="What felt powerful?">
      <OpenText value={data.s2_powerful} onChange={v => setField('s2_powerful', v)} placeholder="What features impressed you most?" />
    </Q>
    <Q label="What would prevent you from using this daily?">
      <OpenText value={data.s2_daily_blocker} onChange={v => setField('s2_daily_blocker', v)} placeholder="Missing features, friction points, performance issues..." />
    </Q>
    <Q label="If this disappeared tomorrow, would you care?">
      {['Yes', 'Maybe', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s2_would_miss === opt} onSelect={v => setField('s2_would_miss', v)} label={opt} />
      ))}
    </Q>
    <Q label="Why?">
      <OpenText value={data.s2_would_miss_why} onChange={v => setField('s2_would_miss_why', v)} placeholder="Tell us more..." />
    </Q>
  </div>
);

const Section3 = ({ data, setField }) => (
  <div className="space-y-6">
    <Q label="Are the pipeline stages logical?">
      {['Yes', 'Mostly', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s3_stages_logical === opt} onSelect={v => setField('s3_stages_logical', v)} label={opt} />
      ))}
    </Q>
    <Q label="Are any stages missing?">
      <OpenText value={data.s3_missing_stages} onChange={v => setField('s3_missing_stages', v)} placeholder="Which stages are missing?" />
    </Q>
    <Q label="Are any stages unnecessary?">
      <OpenText value={data.s3_unnecessary_stages} onChange={v => setField('s3_unnecessary_stages', v)} placeholder="Which stages would you remove?" />
    </Q>
    <Q label="When you move an investor to a new stage — did you expect tasks to auto-generate?">
      {['Yes', 'No', "Didn't notice"].map(opt => (
        <Radio key={opt} value={opt} selected={data.s3_expected_auto_tasks === opt} onSelect={v => setField('s3_expected_auto_tasks', v)} label={opt} />
      ))}
    </Q>
    <Q label="Did the auto-generated tasks make sense?">
      {['Yes, all of them', 'Most of them', 'Some of them', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s3_tasks_made_sense === opt} onSelect={v => setField('s3_tasks_made_sense', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should tasks be:">
      {['Auto-created always', 'Suggested but optional', 'Manual only'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s3_task_preference === opt} onSelect={v => setField('s3_task_preference', v)} label={opt} />
      ))}
    </Q>
    <SubLabel>What tasks were missing in each stage?</SubLabel>
    <Q label="Intro Email stage">
      <OpenText value={data.s3_missing_intro_email} onChange={v => setField('s3_missing_intro_email', v)} placeholder="Missing tasks..." />
    </Q>
    <Q label="First Meeting stage">
      <OpenText value={data.s3_missing_first_meeting} onChange={v => setField('s3_missing_first_meeting', v)} placeholder="Missing tasks..." />
    </Q>
    <Q label="Due Diligence stage">
      <OpenText value={data.s3_missing_due_diligence} onChange={v => setField('s3_missing_due_diligence', v)} placeholder="Missing tasks..." />
    </Q>
    <Q label="Capital Call stage">
      <OpenText value={data.s3_missing_capital_call} onChange={v => setField('s3_missing_capital_call', v)} placeholder="Missing tasks..." />
    </Q>
  </div>
);

const Section4 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="Does the system vs manual task distinction make sense?">
      {['Yes', 'Somewhat', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s4_system_manual_clear === opt} onSelect={v => setField('s4_system_manual_clear', v)} label={opt} />
      ))}
    </Q>
    <Q label="Do you want: (select all that apply)">
      {['Stage-based tasks only', 'Investor-based tasks', 'Global fund tasks'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s4_task_scope || []).includes(opt)} onToggle={v => toggleInArray('s4_task_scope', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should tasks auto-assign based on: (select all that apply)">
      {['Investor persona', 'Stage', 'Investment size', 'Relationship strength'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s4_auto_assign_by || []).includes(opt)} onToggle={v => toggleInArray('s4_auto_assign_by', v)} label={opt} />
      ))}
    </Q>
    <Q label="Is priority logic clear?">
      {['Yes', 'Somewhat', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s4_priority_clear === opt} onSelect={v => setField('s4_priority_clear', v)} label={opt} />
      ))}
    </Q>
    <Q label="Would you want recurring tasks (e.g., follow-ups every 7 days)?">
      {['Yes', 'Maybe', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s4_recurring_tasks === opt} onSelect={v => setField('s4_recurring_tasks', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section5 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="Does the capital overview reflect reality clearly?">
      {['Yes', 'Mostly', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s5_reflects_reality === opt} onSelect={v => setField('s5_reflects_reality', v)} label={opt} />
      ))}
    </Q>
    <Q label="What metrics are missing? (select all that apply)">
      {['Probability-weighted capital', 'Conversion rate per stage', 'Avg. time in stage', 'Forecasted close date', 'Capital by persona', 'Other'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s5_missing_metrics || []).includes(opt)} onToggle={v => toggleInArray('s5_missing_metrics', v)} label={opt} />
      ))}
    </Q>
    <Q label="Would you rely on this dashboard to present to partners?">
      {['Yes', 'With improvements', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s5_partner_presentation === opt} onSelect={v => setField('s5_partner_presentation', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section6 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="Is persona scoring useful?">
      {['Very useful', 'Somewhat useful', 'Not useful'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s6_persona_useful === opt} onSelect={v => setField('s6_persona_useful', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should investors have: (select all that apply)">
      {['Risk score', 'Likelihood-to-close score', 'Ticket size probability', 'Relationship warmth score'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s6_wanted_scores || []).includes(opt)} onToggle={v => toggleInArray('s6_wanted_scores', v)} label={opt} />
      ))}
    </Q>
    <Q label="What fields are missing? (select all that apply)">
      {['Net worth range', 'Investment mandate', 'Previous investments', 'Decision timeline', 'Referral source'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s6_missing_fields || []).includes(opt)} onToggle={v => toggleInArray('s6_missing_fields', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section7 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="Is the Chrome capture workflow clear?">
      {['Yes, very clear', 'Mostly', 'No, confusing'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s7_workflow_clear === opt} onSelect={v => setField('s7_workflow_clear', v)} label={opt} />
      ))}
    </Q>
    <Q label="What additional data should auto-capture? (select all that apply)">
      {['LinkedIn profile', 'Company AUM', 'Recent deals', 'Contact emails', 'Team members'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s7_auto_capture || []).includes(opt)} onToggle={v => toggleInArray('s7_auto_capture', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should captured investors auto-assign to a persona?">
      {['Yes', 'No', 'Ask me each time'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s7_auto_assign_persona === opt} onSelect={v => setField('s7_auto_assign_persona', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section8 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="Would you connect Gmail?">
      {['Yes', 'Maybe', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s8_would_connect_gmail === opt} onSelect={v => setField('s8_would_connect_gmail', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should emails automatically: (select all that apply)">
      {['Create tasks', 'Move stages', 'Update engagement score'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s8_email_automation || []).includes(opt)} onToggle={v => toggleInArray('s8_email_automation', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should call logs affect probability scoring?">
      {['Yes', 'Maybe', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s8_call_logs_scoring === opt} onSelect={v => setField('s8_call_logs_scoring', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section9 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <Q label="Would you want AI to: (select all that apply)">
      {['Draft intro emails', 'Suggest next best action', 'Predict close probability', 'Flag at-risk investors', 'Suggest capital allocation strategy'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.s9_ai_features || []).includes(opt)} onToggle={v => toggleInArray('s9_ai_features', v)} label={opt} />
      ))}
    </Q>
    <Q label="What level of automation feels comfortable?">
      {['Fully automated (AI decides)', 'AI suggests, I confirm', 'AI assists, I always decide', 'I prefer manual control'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s9_automation_comfort === opt} onSelect={v => setField('s9_automation_comfort', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const Section10 = ({ data, setField }) => (
  <div className="space-y-6">
    <Q label="If this was a paid product, what would you expect it to cost monthly?">
      {['$0 (free)', '$50–$100', '$100–$300', '$300–$500', '$500–$1,000', '$1,000+', 'Enterprise pricing (custom)'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s10_monthly_cost === opt} onSelect={v => setField('s10_monthly_cost', v)} label={opt} />
      ))}
    </Q>
    <Q label="Would this replace Excel for you?">
      {['Yes, completely', 'Partially', "No, I'd use both", 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.s10_replace_excel === opt} onSelect={v => setField('s10_replace_excel', v)} label={opt} />
      ))}
    </Q>
    <Q label="What would make this institutional-grade?">
      <OpenText value={data.s10_institutional_grade} onChange={v => setField('s10_institutional_grade', v)} placeholder="Compliance features, audit logs, multi-fund reporting..." />
    </Q>
    <Q label="What is the ONE feature that would make this irreplaceable?">
      <OpenText value={data.s10_irreplaceable_feature} onChange={v => setField('s10_irreplaceable_feature', v)} placeholder="That one thing..." />
    </Q>
    <Q label="What feels unfinished?">
      <OpenText value={data.s10_unfinished} onChange={v => setField('s10_unfinished', v)} placeholder="Areas that need more work..." />
    </Q>
  </div>
);

const RANKING_ITEMS_DEFAULT = [
  'UI polish',
  'Task automation logic',
  'Capital forecasting',
  'Persona intelligence',
  'Communication syncing',
  'Data room integration',
  'Compliance tracking',
];

const RankingList = ({ items, onChange }) => {
  const moveUp = (idx) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };
  const moveDown = (idx) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={item} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#1A2744] bg-[#0A1628]">
          <span className="w-6 h-6 rounded-full bg-[#0047AB]/20 border border-[#0047AB]/40 flex items-center justify-center text-[#00A3FF] text-xs font-bold flex-shrink-0">
            {idx + 1}
          </span>
          <span className="flex-1 text-white text-sm">{item}</span>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-[#94A3B8] hover:text-white disabled:opacity-20 transition-colors">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={() => moveDown(idx)} disabled={idx === items.length - 1} className="p-0.5 text-[#94A3B8] hover:text-white disabled:opacity-20 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const Section11 = ({ data, setField }) => {
  const ranking = data.s11_ranking?.length > 0 ? data.s11_ranking : RANKING_ITEMS_DEFAULT;
  return (
    <div className="space-y-6">
      <Q label="Rank what should be improved first (use arrows to reorder — #1 is highest priority):">
        <RankingList items={ranking} onChange={v => setField('s11_ranking', v)} />
      </Q>
    </div>
  );
};

const Section12 = ({ data, setField, toggleInArray }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1A2744]/50 border border-[#1A2744]">
      <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
      <p className="text-[#94A3B8] text-xs">This section is optional — for advanced platform builders and power users.</p>
    </div>
    <Q label="Should stages have conversion % built-in?">
      {['Yes', 'Maybe', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.dev_stage_conversion === opt} onSelect={v => setField('dev_stage_conversion', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should probability change automatically by stage?">
      {['Yes', 'Maybe', 'No'].map(opt => (
        <Radio key={opt} value={opt} selected={data.dev_auto_probability === opt} onSelect={v => setField('dev_auto_probability', v)} label={opt} />
      ))}
    </Q>
    <Q label="Should capital forecast update dynamically based on: (select all that apply)">
      {['Stage weight', 'Persona type', 'Engagement level'].map(opt => (
        <Checkbox key={opt} value={opt} checked={(data.dev_dynamic_forecast || []).includes(opt)} onToggle={v => toggleInArray('dev_dynamic_forecast', v)} label={opt} />
      ))}
    </Q>
  </div>
);

const SECTION_RENDERERS = [
  Section1, Section2, Section3, Section4, Section5, Section6,
  Section7, Section8, Section9, Section10, Section11, Section12,
];

// ─── Success screen ───────────────────────────────────────────────────────────

const SuccessScreen = ({ navigate, user }) => (
  <div
    style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
    className="min-h-screen flex flex-col items-center justify-center p-6"
  >
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-[#22C55E]" />
      </div>
      <div>
        <h2 className="text-white text-2xl font-bold">
          Thank you{user?.first_name ? `, ${user.first_name}` : ''}!
        </h2>
        <p className="text-[#94A3B8] mt-2 leading-relaxed">
          Your feedback helps us build a better platform for fund managers everywhere.
          Every response shapes what we prioritize next.
        </p>
      </div>
      <img src={LOGO_URL} alt="ALKNZ" className="h-8 w-auto mx-auto opacity-60" />
      <Button
        onClick={() => navigate(-1)}
        className="bg-[#0047AB] hover:bg-blue-700 text-white px-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
    </div>
  </div>
);

// ─── Main FeedbackPage ────────────────────────────────────────────────────────

const FeedbackPage = () => {
  const { token, API_URL, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ s11_ranking: [...RANKING_ITEMS_DEFAULT] });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (key, value) => setData(prev => ({ ...prev, [key]: value }));
  const toggleInArray = (key, value) => {
    const arr = data[key] || [];
    setData(prev => ({
      ...prev,
      [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
    }));
  };

  const section = SECTIONS[step];
  const SectionRenderer = SECTION_RENDERERS[step];
  const isLastStep = step === SECTIONS.length - 1;
  const progress = ((step + 1) / SECTIONS.length) * 100;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/feedback`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitted(true);
    } catch {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <SuccessScreen navigate={navigate} user={user} />;

  return (
    <div
      style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
      className="min-h-screen flex flex-col"
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-[#1A2744]"
        style={{ background: 'rgba(2, 4, 10, 0.90)', backdropFilter: 'blur(12px)' }}
      >
        <img src={LOGO_URL} alt="ALKNZ" className="h-7 w-auto" />
        <div className="text-center">
          <p className="text-white text-sm font-semibold">User Testing Feedback</p>
          <p className="text-[#94A3B8] text-xs">
            Section {step + 1} of {SECTIONS.length}
            {section.optional ? ' — Optional' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[#94A3B8] hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit
        </button>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[#1A2744]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: section.color }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-2xl">

          {/* Section header */}
          <div className="mb-8 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${section.color}20`, border: `1px solid ${section.color}40` }}
            >
              <section.icon className="w-6 h-6" style={{ color: section.color }} />
            </div>
            <div>
              <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
                Section {section.num}{section.optional ? ' — Optional' : ''}
              </p>
              <h1 className="text-white text-xl font-bold mt-0.5">{section.title}</h1>
            </div>
          </div>

          {/* Section content card */}
          <div className="bg-[#0A1628]/60 border border-[#1A2744] rounded-2xl p-6 mb-8">
            <SectionRenderer data={data} setField={setField} toggleInArray={toggleInArray} />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="border-[#1A2744] text-[#94A3B8] hover:bg-[#1A2744] hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>

            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {SECTIONS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 8,
                    height: 8,
                    background: i === step ? section.color : i < step ? '#1A2744' : '#1A2744',
                    opacity: i < step ? 0.8 : 1,
                  }}
                />
              ))}
            </div>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="text-white px-6"
                style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(s => Math.min(SECTIONS.length - 1, s + 1))}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>

          {/* Section jump (mini nav) */}
          <div className="mt-8 pt-6 border-t border-[#1A2744]">
            <p className="text-[#94A3B8] text-xs mb-3 text-center">Jump to section</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {SECTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    i === step
                      ? 'text-white'
                      : 'text-[#94A3B8] hover:text-white bg-[#1A2744]/50 hover:bg-[#1A2744]'
                  }`}
                  style={i === step ? { background: `${s.color}30`, color: s.color, border: `1px solid ${s.color}50` } : {}}
                >
                  {s.num}. {s.title.split(' ')[0]}
                  {s.optional ? '*' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
