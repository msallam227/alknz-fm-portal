import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Merge, 
  ArrowRight, 
  ArrowLeft,
  Check,
  X,
  Briefcase,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Fields to compare and merge
const MERGE_FIELDS = [
  { key: 'investor_name', label: 'Investor Name', required: true },
  { key: 'title', label: 'Title' },
  { key: 'gender', label: 'Gender' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'investor_type', label: 'Investor Type' },
  { key: 'sector', label: 'Sector' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'website', label: 'Website' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'wealth', label: 'Wealth' },
  { key: 'contact_name', label: 'Contact Name' },
  { key: 'contact_title', label: 'Contact Title' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'contact_email', label: 'Contact Email' },
  { key: 'contact_whatsapp', label: 'WhatsApp' },
  { key: 'relationship_strength', label: 'Relationship Strength' },
  { key: 'decision_role', label: 'Decision Role' },
  { key: 'preferred_intro_path', label: 'Preferred Intro Path' },
  { key: 'expected_ticket_amount', label: 'Expected Ticket', type: 'number' },
  { key: 'investment_size', label: 'Investment Size', type: 'number' },
];

const MergeCompareModal = ({
  open,
  onClose,
  duplicateGroup,
  token,
  API_URL,
  onSuccess
}) => {
  const [step, setStep] = useState(1); // 1: Compare, 2: Review & Assign
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [investorDetails, setInvestorDetails] = useState([]);
  const [mergedData, setMergedData] = useState({});
  const [selectedSources, setSelectedSources] = useState({}); // Track which investor's data is selected per field
  const [expandedSections, setExpandedSections] = useState({
    identity: true,
    contact: true,
    investment: false
  });
  
  // Fund assignment
  const [allFunds, setAllFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [fundManagersCache, setFundManagersCache] = useState({});
  const [fundStagesCache, setFundStagesCache] = useState({});
  const [fundAssignments, setFundAssignments] = useState({});

  // Fetch full investor details when modal opens
  useEffect(() => {
    if (open && duplicateGroup?.investors?.length > 0) {
      fetchInvestorDetails();
      fetchFunds();
    }
  }, [open, duplicateGroup]);

  const fetchInvestorDetails = async () => {
    setLoading(true);
    try {
      const details = await Promise.all(
        duplicateGroup.investors.map(inv =>
          axios.get(`${API_URL}/api/investor-profiles/${inv.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.data).catch(() => inv)
        )
      );
      setInvestorDetails(details);
      
      // Initialize merged data with the first investor's data (oldest)
      const initial = details[0] || {};
      const merged = {};
      const sources = {};
      
      MERGE_FIELDS.forEach(field => {
        // Find the first non-empty value
        for (let i = 0; i < details.length; i++) {
          const value = details[i]?.[field.key];
          if (value !== null && value !== undefined && value !== '') {
            merged[field.key] = value;
            sources[field.key] = i;
            break;
          }
        }
        if (merged[field.key] === undefined) {
          merged[field.key] = '';
          sources[field.key] = 0;
        }
      });
      
      setMergedData(merged);
      setSelectedSources(sources);
      
      // Pre-select funds that investors are assigned to
      const fundIds = new Set();
      details.forEach(inv => {
        if (inv.fund_id) fundIds.add(inv.fund_id);
      });
      setSelectedFunds(Array.from(fundIds));
      
    } catch (error) {
      console.error('Failed to fetch investor details:', error);
      toast.error('Failed to load investor details');
    } finally {
      setLoading(false);
    }
  };

  const fetchFunds = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/funds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllFunds(res.data || []);
    } catch (error) {
      console.error('Failed to fetch funds:', error);
    }
  };

  const fetchFundManagers = async (fundId) => {
    if (fundManagersCache[fundId]) return fundManagersCache[fundId];
    try {
      const res = await axios.get(`${API_URL}/api/admin/funds/${fundId}/fund-managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const managers = res.data.fund_managers || [];
      setFundManagersCache(prev => ({ ...prev, [fundId]: managers }));
      return managers;
    } catch (error) {
      return [];
    }
  };

  const fetchPipelineStages = async (fundId) => {
    if (fundStagesCache[fundId]) return fundStagesCache[fundId];
    try {
      const res = await axios.get(`${API_URL}/api/funds/${fundId}/pipeline-stages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stages = res.data || [];
      setFundStagesCache(prev => ({ ...prev, [fundId]: stages }));
      return stages;
    } catch (error) {
      return [];
    }
  };

  const handleSelectSource = (fieldKey, sourceIndex) => {
    setSelectedSources(prev => ({ ...prev, [fieldKey]: sourceIndex }));
    setMergedData(prev => ({
      ...prev,
      [fieldKey]: investorDetails[sourceIndex]?.[fieldKey] || ''
    }));
  };

  const handleEditMerged = (fieldKey, value) => {
    setMergedData(prev => ({ ...prev, [fieldKey]: value }));
    setSelectedSources(prev => ({ ...prev, [fieldKey]: 'custom' }));
  };

  const toggleFundSelection = async (fundId) => {
    if (selectedFunds.includes(fundId)) {
      setSelectedFunds(prev => prev.filter(id => id !== fundId));
      setFundAssignments(prev => {
        const next = { ...prev };
        delete next[fundId];
        return next;
      });
    } else {
      setSelectedFunds(prev => [...prev, fundId]);
      // Fetch managers and stages for this fund
      const [managers, stages] = await Promise.all([
        fetchFundManagers(fundId),
        fetchPipelineStages(fundId)
      ]);
      const defaultStage = stages.find(s => s.name === 'Investors');
      setFundAssignments(prev => ({
        ...prev,
        [fundId]: {
          managers,
          stages,
          assigned_manager_id: '',
          initial_stage_id: defaultStage?.id || ''
        }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!mergedData.investor_name) {
      toast.error('Investor name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      // Step 1: Keep the oldest investor and update with merged data
      const keepId = investorDetails[0]?.id;
      const deleteIds = investorDetails.slice(1).map(inv => inv.id);
      
      // Update the kept investor with merged data
      await axios.put(
        `${API_URL}/api/investor-profiles/${keepId}`,
        mergedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Step 2: Merge (reassign related data and delete duplicates)
      if (deleteIds.length > 0) {
        await axios.post(
          `${API_URL}/api/admin/merge-investors`,
          {
            keep_investor_id: keepId,
            delete_investor_ids: deleteIds
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Step 3: Assign to selected funds (if any new ones)
      const existingFundIds = investorDetails.map(inv => inv.fund_id).filter(Boolean);
      const newFundIds = selectedFunds.filter(id => !existingFundIds.includes(id));
      
      if (newFundIds.length > 0) {
        const fundAssignmentsPayload = newFundIds.map(fundId => ({
          fund_id: fundId,
          assigned_manager_id: fundAssignments[fundId]?.assigned_manager_id || null,
          initial_stage_id: fundAssignments[fundId]?.initial_stage_id || null
        }));
        
        await axios.post(
          `${API_URL}/api/admin/investor-fund-assignments`,
          {
            investor_id: keepId,
            fund_assignments: fundAssignmentsPayload
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success('Investors merged and assigned successfully');
      onSuccess && onSuccess();
      onClose();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to merge investors');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setMergedData({});
    setSelectedSources({});
    setSelectedFunds([]);
    setFundAssignments({});
    onClose();
  };

  const getFieldValue = (investor, fieldKey) => {
    const value = investor?.[fieldKey];
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  const renderFieldComparison = (field) => {
    const values = investorDetails.map(inv => getFieldValue(inv, field.key));
    const allSame = values.every(v => v === values[0]);
    const hasValue = values.some(v => v !== '-');
    
    if (!hasValue && !field.required) return null;
    
    return (
      <div key={field.key} className="grid grid-cols-[1fr,auto,1fr,auto,1fr] gap-2 items-start py-2 border-b border-[#1A2744]/50">
        {/* Investor 1 value */}
        <div 
          className={`p-2 rounded cursor-pointer transition-colors ${
            selectedSources[field.key] === 0 
              ? 'bg-[#22C55E]/20 border border-[#22C55E]' 
              : 'bg-[#02040A]/40 hover:bg-[#1A2744]/50'
          }`}
          onClick={() => handleSelectSource(field.key, 0)}
        >
          <p className="text-xs text-[#94A3B8] mb-1">{field.label}</p>
          <p className={`text-sm ${values[0] === '-' ? 'text-[#475569]' : 'text-white'}`}>
            {values[0]}
          </p>
        </div>
        
        {/* Arrow from 1 */}
        <div className="flex items-center justify-center pt-6">
          {selectedSources[field.key] === 0 && (
            <ArrowRight className="h-4 w-4 text-[#22C55E]" />
          )}
        </div>
        
        {/* Merged value (center) */}
        <div className="p-2 rounded bg-[#0047AB]/20 border border-[#0047AB]/50">
          <p className="text-xs text-[#00A3FF] mb-1">Merged Value</p>
          {field.type === 'textarea' ? (
            <Textarea
              value={mergedData[field.key] || ''}
              onChange={(e) => handleEditMerged(field.key, e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm min-h-[60px]"
            />
          ) : (
            <Input
              type={field.type || 'text'}
              value={mergedData[field.key] || ''}
              onChange={(e) => handleEditMerged(field.key, e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm h-8"
            />
          )}
        </div>
        
        {/* Arrow from 2 */}
        <div className="flex items-center justify-center pt-6">
          {selectedSources[field.key] === 1 && investorDetails.length > 1 && (
            <ArrowLeft className="h-4 w-4 text-[#22C55E]" />
          )}
        </div>
        
        {/* Investor 2 value */}
        {investorDetails.length > 1 ? (
          <div 
            className={`p-2 rounded cursor-pointer transition-colors ${
              selectedSources[field.key] === 1 
                ? 'bg-[#22C55E]/20 border border-[#22C55E]' 
                : 'bg-[#02040A]/40 hover:bg-[#1A2744]/50'
            }`}
            onClick={() => handleSelectSource(field.key, 1)}
          >
            <p className="text-xs text-[#94A3B8] mb-1">{field.label}</p>
            <p className={`text-sm ${values[1] === '-' ? 'text-[#475569]' : 'text-white'}`}>
              {values[1]}
            </p>
          </div>
        ) : (
          <div className="p-2 text-[#475569] text-sm">-</div>
        )}
      </div>
    );
  };

  if (!duplicateGroup) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold flex items-center gap-2 text-xl">
            <Merge className="h-5 w-5 text-[#00A3FF]" />
            Merge & Combine: {duplicateGroup.investor_name}
          </DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            {step === 1 
              ? 'Compare records side-by-side. Click a value to use it, or edit the merged value directly.'
              : 'Review merged data and select which funds to assign.'
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0047AB]" />
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`flex items-center gap-2 ${step === 1 ? 'text-[#00A3FF]' : 'text-[#94A3B8]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  step === 1 ? 'bg-[#0047AB] text-white' : 'bg-[#1A2744] text-[#94A3B8]'
                }`}>1</div>
                <span className="text-sm font-medium">Compare & Merge</span>
              </div>
              <div className="h-px flex-1 bg-[#1A2744]" />
              <div className={`flex items-center gap-2 ${step === 2 ? 'text-[#00A3FF]' : 'text-[#94A3B8]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  step === 2 ? 'bg-[#0047AB] text-white' : 'bg-[#1A2744] text-[#94A3B8]'
                }`}>2</div>
                <span className="text-sm font-medium">Assign to Funds</span>
              </div>
            </div>

            {step === 1 ? (
              /* Step 1: Compare & Merge */
              <div className="space-y-4">
                {/* Header row showing investor sources */}
                <div className="grid grid-cols-[1fr,auto,1fr,auto,1fr] gap-2 mb-2">
                  <div className="p-2 bg-[#1A2744]/50 rounded">
                    <p className="text-xs text-[#94A3B8]">Source 1 (Oldest)</p>
                    <p className="text-sm font-medium text-white">
                      {investorDetails[0]?.investor_name || '-'}
                    </p>
                    <Badge className="mt-1 bg-[#3B82F6]/20 text-[#3B82F6] border-0 text-xs">
                      {duplicateGroup.investors[0]?.fund_name || 'Unknown Fund'}
                    </Badge>
                  </div>
                  <div />
                  <div className="p-2 bg-[#0047AB]/20 rounded text-center">
                    <p className="text-xs text-[#00A3FF]">Merged Result</p>
                    <p className="text-sm font-medium text-white">Combined Data</p>
                  </div>
                  <div />
                  {investorDetails.length > 1 && (
                    <div className="p-2 bg-[#1A2744]/50 rounded">
                      <p className="text-xs text-[#94A3B8]">Source 2 (Newer)</p>
                      <p className="text-sm font-medium text-white">
                        {investorDetails[1]?.investor_name || '-'}
                      </p>
                      <Badge className="mt-1 bg-[#A78BFA]/20 text-[#A78BFA] border-0 text-xs">
                        {duplicateGroup.investors[1]?.fund_name || 'Unknown Fund'}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Identity Section */}
                <div className="border border-[#1A2744] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(p => ({ ...p, identity: !p.identity }))}
                    className="w-full flex items-center justify-between p-3 bg-[#1A2744]/30 hover:bg-[#1A2744]/50"
                  >
                    <span className="font-medium text-white flex items-center gap-2">
                      <User className="h-4 w-4 text-[#00A3FF]" />
                      Identity Information
                    </span>
                    {expandedSections.identity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expandedSections.identity && (
                    <div className="p-3">
                      {MERGE_FIELDS.filter(f => ['investor_name', 'title', 'gender', 'nationality', 'age', 'job_title', 'investor_type', 'sector', 'country', 'city', 'website', 'description'].includes(f.key))
                        .map(renderFieldComparison)}
                    </div>
                  )}
                </div>

                {/* Contact Section */}
                <div className="border border-[#1A2744] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(p => ({ ...p, contact: !p.contact }))}
                    className="w-full flex items-center justify-between p-3 bg-[#1A2744]/30 hover:bg-[#1A2744]/50"
                  >
                    <span className="font-medium text-white flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#00A3FF]" />
                      Contact & Relationship
                    </span>
                    {expandedSections.contact ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expandedSections.contact && (
                    <div className="p-3">
                      {MERGE_FIELDS.filter(f => ['contact_name', 'contact_title', 'contact_phone', 'contact_email', 'contact_whatsapp', 'relationship_strength', 'decision_role', 'preferred_intro_path'].includes(f.key))
                        .map(renderFieldComparison)}
                    </div>
                  )}
                </div>

                {/* Investment Section */}
                <div className="border border-[#1A2744] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(p => ({ ...p, investment: !p.investment }))}
                    className="w-full flex items-center justify-between p-3 bg-[#1A2744]/30 hover:bg-[#1A2744]/50"
                  >
                    <span className="font-medium text-white flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-[#00A3FF]" />
                      Investment Context
                    </span>
                    {expandedSections.investment ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expandedSections.investment && (
                    <div className="p-3">
                      {MERGE_FIELDS.filter(f => ['wealth', 'expected_ticket_amount', 'investment_size'].includes(f.key))
                        .map(renderFieldComparison)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Assign to Funds */
              <div className="space-y-4">
                <div className="p-4 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg">
                  <p className="text-sm text-[#22C55E]">
                    <strong>Merged investor:</strong> {mergedData.investor_name}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Related data (evidence, notes, call logs, tasks) from deleted records will be transferred.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Select funds to assign:</Label>
                  
                  {allFunds.map(fund => {
                    const isSelected = selectedFunds.includes(fund.id);
                    const isOriginal = investorDetails.some(inv => inv.fund_id === fund.id);
                    
                    return (
                      <div 
                        key={fund.id}
                        className={`border rounded-lg p-3 transition-colors ${
                          isSelected 
                            ? 'border-[#22C55E] bg-[#22C55E]/10' 
                            : 'border-[#1A2744] hover:border-[#0047AB]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleFundSelection(fund.id)}
                            className="border-[#1A2744] data-[state=checked]:bg-[#22C55E] data-[state=checked]:border-[#22C55E]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{fund.name}</span>
                              <Badge className="bg-[#1A2744] text-[#94A3B8] border-0 text-xs">
                                {fund.fund_type}
                              </Badge>
                              {isOriginal && (
                                <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-0 text-xs">
                                  Currently Assigned
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Fund assignment options */}
                        {isSelected && !isOriginal && fundAssignments[fund.id] && (
                          <div className="mt-3 pt-3 border-t border-[#1A2744] grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-[#94A3B8]">Fund Manager</Label>
                              <Select
                                value={fundAssignments[fund.id].assigned_manager_id || 'none'}
                                onValueChange={(v) => setFundAssignments(prev => ({
                                  ...prev,
                                  [fund.id]: { ...prev[fund.id], assigned_manager_id: v === 'none' ? '' : v }
                                }))}
                              >
                                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white h-8 text-sm">
                                  <SelectValue placeholder="Select manager" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                                  <SelectItem value="none" className="text-white">No specific owner</SelectItem>
                                  {fundAssignments[fund.id].managers?.map(m => (
                                    <SelectItem key={m.id} value={m.id} className="text-white">
                                      {m.first_name} {m.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-[#94A3B8]">Initial Stage</Label>
                              <Select
                                value={fundAssignments[fund.id].initial_stage_id || 'default'}
                                onValueChange={(v) => setFundAssignments(prev => ({
                                  ...prev,
                                  [fund.id]: { ...prev[fund.id], initial_stage_id: v === 'default' ? '' : v }
                                }))}
                              >
                                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white h-8 text-sm">
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                                  {fundAssignments[fund.id].stages?.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-white">
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
          >
            Cancel
          </Button>
          
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!mergedData.investor_name}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
            >
              Next: Assign to Funds
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || selectedFunds.length === 0}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                data-testid="confirm-merge-combine"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Merge & Assign
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MergeCompareModal;
