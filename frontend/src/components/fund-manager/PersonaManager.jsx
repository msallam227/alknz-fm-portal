import React, { useState } from 'react';
import {
  UserCircle2, Plus, Edit2, Trash2, Sparkles, ChevronDown,
  ChevronUp, Target, Users, Lightbulb, CheckCircle, X, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePersonaData } from '../../hooks/usePersonaData';

const INVESTOR_TYPES = ['Individual', 'Family Office', 'Institution', 'Corporate', 'Angel Investor', 'Sovereign Wealth Fund'];
const GENDER_OPTIONS = ['Male', 'Female', 'Diverse'];

// ─── Persona Form ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  description: '',
  target_investor_type: '',
  target_gender: '',
  target_age_min: '',
  target_nationalities: '',
  target_sectors: '',
  professional_goals: '',
  professional_frustrations: '',
  why_invest: '',
  decision_making_process: '',
  min_ticket_size: '',
  max_ticket_size: '',
};

function PersonaForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          target_nationalities: (initial.target_nationalities || []).join(', '),
          target_sectors: (initial.target_sectors || []).join(', '),
          target_age_min: initial.target_age_min ?? '',
          min_ticket_size: initial.min_ticket_size ?? '',
          max_ticket_size: initial.max_ticket_size ?? '',
        }
      : EMPTY_FORM
  );

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Persona name is required'); return; }
    const data = {
      name: form.name.trim(),
      description: form.description || null,
      target_investor_type: form.target_investor_type || null,
      target_gender: form.target_gender || null,
      target_age_min: form.target_age_min !== '' ? parseInt(form.target_age_min) : null,
      target_nationalities: form.target_nationalities ? form.target_nationalities.split(',').map(s => s.trim()).filter(Boolean) : [],
      target_sectors: form.target_sectors ? form.target_sectors.split(',').map(s => s.trim()).filter(Boolean) : [],
      professional_goals: form.professional_goals || null,
      professional_frustrations: form.professional_frustrations || null,
      why_invest: form.why_invest || null,
      decision_making_process: form.decision_making_process || null,
      min_ticket_size: form.min_ticket_size !== '' ? parseFloat(form.min_ticket_size) : null,
      max_ticket_size: form.max_ticket_size !== '' ? parseFloat(form.max_ticket_size) : null,
    };
    onSave(data);
  };

  const inputCls = 'bg-[#0A1628] border border-[#1A2744] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#0047AB]';
  const labelCls = 'block text-xs text-[#94A3B8] mb-1';

  return (
    <div className="bg-[#0A1628] border border-[#1A2744] rounded-xl p-6 space-y-4">
      <h3 className="text-white font-semibold text-base">{initial ? 'Edit Persona' : 'Create New Persona'}</h3>

      {/* Name */}
      <div>
        <label className={labelCls}>Persona Name *</label>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Real Estate Regular Investor" className="bg-[#0A1628] border-[#1A2744] text-white" />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this investor archetype..." rows={2} className={inputCls} />
      </div>

      {/* Row: Type + Gender + Age */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Target Investor Type</label>
          <select value={form.target_investor_type} onChange={e => set('target_investor_type', e.target.value)} className={inputCls}>
            <option value="">Any</option>
            {INVESTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Target Gender</label>
          <select value={form.target_gender} onChange={e => set('target_gender', e.target.value)} className={inputCls}>
            <option value="">Any</option>
            {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Min Age</label>
          <input type="number" value={form.target_age_min} onChange={e => set('target_age_min', e.target.value)} placeholder="e.g. 45" className={inputCls} />
        </div>
      </div>

      {/* Nationalities + Sectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Target Nationalities (comma-separated)</label>
          <input value={form.target_nationalities} onChange={e => set('target_nationalities', e.target.value)} placeholder="e.g. GCC, Saudi Arabia, UAE" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Target Sectors (comma-separated)</label>
          <input value={form.target_sectors} onChange={e => set('target_sectors', e.target.value)} placeholder="e.g. Real Estate, Technology" className={inputCls} />
        </div>
      </div>

      {/* Ticket Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Min Ticket Size (USD)</label>
          <input type="number" value={form.min_ticket_size} onChange={e => set('min_ticket_size', e.target.value)} placeholder="e.g. 250000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Max Ticket Size (USD)</label>
          <input type="number" value={form.max_ticket_size} onChange={e => set('max_ticket_size', e.target.value)} placeholder="e.g. 5000000" className={inputCls} />
        </div>
      </div>

      {/* Intelligence fields */}
      <div>
        <label className={labelCls}>Professional Goals</label>
        <textarea value={form.professional_goals} onChange={e => set('professional_goals', e.target.value)} placeholder="What motivates this persona? What are their investment goals?" rows={2} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Professional Frustrations</label>
        <textarea value={form.professional_frustrations} onChange={e => set('professional_frustrations', e.target.value)} placeholder="What barriers or challenges does this persona face?" rows={2} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Why Invest in This Fund</label>
        <textarea value={form.why_invest} onChange={e => set('why_invest', e.target.value)} placeholder="Why would this persona invest in your fund specifically?" rows={2} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Decision Making Process</label>
        <textarea value={form.decision_making_process} onChange={e => set('decision_making_process', e.target.value)} placeholder="How does this persona make investment decisions?" rows={2} className={inputCls} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#0047AB] hover:bg-blue-700 text-white">
          {loading ? 'Saving...' : (initial ? 'Update Persona' : 'Create Persona')}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-[#94A3B8] hover:text-white">Cancel</Button>
      </div>
    </div>
  );
}

// ─── Persona Card ─────────────────────────────────────────────────────────────
function PersonaCard({ persona, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const chips = [
    persona.target_investor_type,
    ...(persona.target_nationalities || []),
    ...(persona.target_sectors || []),
    persona.target_gender && persona.target_gender !== 'Diverse' ? persona.target_gender : null,
    persona.target_age_min ? `${persona.target_age_min}+` : null,
  ].filter(Boolean);

  return (
    <div className="bg-[#0A1628] border border-[#1A2744] rounded-xl p-5 hover:border-[#0047AB]/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#0047AB]/20 flex items-center justify-center flex-shrink-0">
            <UserCircle2 className="w-5 h-5 text-[#00A3FF]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm truncate">{persona.name}</h4>
            {persona.description && (
              <p className="text-[#94A3B8] text-xs mt-0.5 line-clamp-2">{persona.description}</p>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {chips.slice(0, 5).map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#1A2744] text-[#94A3B8]">{c}</span>
                ))}
                {chips.length > 5 && <span className="text-xs text-[#94A3B8]">+{chips.length - 5}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-[#94A3B8] hover:text-white rounded transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onEdit(persona)} className="p-1.5 text-[#94A3B8] hover:text-[#00A3FF] rounded transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(persona.id)} className="p-1.5 text-[#94A3B8] hover:text-red-400 rounded transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pt-4 border-t border-[#1A2744]">
          {persona.professional_goals && (
            <div>
              <p className="text-xs font-medium text-[#00A3FF] mb-1">Professional Goals</p>
              <p className="text-xs text-[#94A3B8]">{persona.professional_goals}</p>
            </div>
          )}
          {persona.professional_frustrations && (
            <div>
              <p className="text-xs font-medium text-yellow-400 mb-1">Professional Frustrations</p>
              <p className="text-xs text-[#94A3B8]">{persona.professional_frustrations}</p>
            </div>
          )}
          {persona.why_invest && (
            <div>
              <p className="text-xs font-medium text-green-400 mb-1">Why Invest in This Fund</p>
              <p className="text-xs text-[#94A3B8]">{persona.why_invest}</p>
            </div>
          )}
          {persona.decision_making_process && (
            <div>
              <p className="text-xs font-medium text-purple-400 mb-1">Decision Making Process</p>
              <p className="text-xs text-[#94A3B8]">{persona.decision_making_process}</p>
            </div>
          )}
          {(persona.min_ticket_size || persona.max_ticket_size) && (
            <div>
              <p className="text-xs font-medium text-[#94A3B8] mb-1">Ticket Range</p>
              <p className="text-xs text-white">
                {persona.min_ticket_size ? `$${persona.min_ticket_size.toLocaleString()}` : 'Any'}
                {' — '}
                {persona.max_ticket_size ? `$${persona.max_ticket_size.toLocaleString()}` : 'Any'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────
function SuggestionCard({ suggestion, onAccept }) {
  const chips = [
    suggestion.target_investor_type,
    ...(suggestion.target_nationalities || []),
    ...(suggestion.target_sectors || []),
    suggestion.target_gender,
  ].filter(Boolean);

  return (
    <div className="bg-[#0A1628] border border-yellow-500/30 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold text-sm">{suggestion.suggested_name}</h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">{suggestion.count} investors</span>
            </div>
            {suggestion.description && (
              <p className="text-[#94A3B8] text-xs mt-1">{suggestion.description}</p>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {chips.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#1A2744] text-[#94A3B8]">{c}</span>
                ))}
              </div>
            )}
            {suggestion.example_investors?.length > 0 && (
              <p className="text-xs text-[#94A3B8] mt-2">
                Examples: {suggestion.example_investors.join(', ')}
              </p>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => onAccept(suggestion)} className="bg-[#0047AB] hover:bg-blue-700 text-white flex-shrink-0">
          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Create
        </Button>
      </div>
    </div>
  );
}

// ─── Main PersonaManager ──────────────────────────────────────────────────────
export const PersonaManager = ({ selectedFund, token, API_URL }) => {
  const fundId = selectedFund?.id;
  const {
    personas, loading, createPersona, updatePersona, deletePersona, suggestPersonas
  } = usePersonaData(fundId, token, API_URL);

  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);

  if (!fundId) {
    return (
      <div className="flex items-center justify-center h-64 text-[#94A3B8]">
        Select a fund to manage personas
      </div>
    );
  }

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      await createPersona(data);
      toast.success('Persona created');
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to create persona');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    setFormLoading(true);
    try {
      await updatePersona(editingPersona.id, data);
      toast.success('Persona updated');
      setEditingPersona(null);
    } catch (err) {
      toast.error('Failed to update persona');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (personaId) => {
    if (!window.confirm('Delete this persona?')) return;
    try {
      await deletePersona(personaId);
      toast.success('Persona deleted');
    } catch (err) {
      toast.error('Failed to delete persona');
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const result = await suggestPersonas();
      setSuggestions(result.suggestions || []);
      if (!result.suggestions?.length) toast.info('No new persona suggestions — all investors are well matched');
    } catch (err) {
      toast.error('Failed to generate suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    const data = {
      name: suggestion.suggested_name,
      description: suggestion.description,
      target_investor_type: suggestion.target_investor_type || null,
      target_nationalities: suggestion.target_nationalities || [],
      target_sectors: suggestion.target_sectors || [],
      target_gender: suggestion.target_gender || null,
      target_age_min: suggestion.target_age_min || null,
      professional_goals: suggestion.professional_goals || null,
      why_invest: suggestion.why_invest || null,
    };
    try {
      await createPersona(data);
      setSuggestions(prev => prev.filter(s => s.suggested_name !== suggestion.suggested_name));
      toast.success('Persona created from suggestion');
    } catch (err) {
      toast.error('Failed to create persona');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <UserCircle2 className="w-6 h-6 text-[#00A3FF]" />
            Investor Personas
          </h2>
          <p className="text-[#94A3B8] text-sm mt-0.5">
            Define investor archetypes for {selectedFund?.name}. Each investor is scored against them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggest}
            disabled={suggesting}
            className="border-[#1A2744] text-[#94A3B8] hover:text-white hover:border-yellow-500/50"
          >
            {suggesting ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5 text-yellow-400" />}
            {suggesting ? 'Analyzing...' : 'Suggest Personas'}
          </Button>
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setEditingPersona(null); }}
            className="bg-[#0047AB] hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Persona
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showForm || editingPersona) && (
        <div className="mb-6">
          <PersonaForm
            initial={editingPersona}
            onSave={editingPersona ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingPersona(null); }}
            loading={formLoading}
          />
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-white font-semibold text-sm">AI-Suggested Personas</h3>
            <span className="text-xs text-[#94A3B8]">Based on investors not matching existing personas</span>
            <button onClick={() => setSuggestions([])} className="ml-auto text-[#94A3B8] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {suggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} onAccept={handleAcceptSuggestion} />
          ))}
        </div>
      )}

      {/* Personas Grid or Empty State */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#94A3B8] text-sm">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading personas...
          </div>
        ) : personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center">
            <Target className="w-12 h-12 text-[#1A2744] mb-4" />
            <p className="text-white font-medium text-sm">No personas defined yet</p>
            <p className="text-[#94A3B8] text-xs mt-1 max-w-xs">
              Create investor archetypes — like "Real Estate Regular Investor" — to automatically score and match every investor in this fund.
            </p>
            <Button size="sm" onClick={() => setShowForm(true)} className="mt-5 bg-[#0047AB] hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Create First Persona
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {personas.map(p => (
              <PersonaCard
                key={p.id}
                persona={p}
                onEdit={persona => { setEditingPersona(persona); setShowForm(false); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
