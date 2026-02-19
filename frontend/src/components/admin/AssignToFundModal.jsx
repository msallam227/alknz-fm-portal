import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  User, 
  GitBranch,
  Check,
  X,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const AssignToFundModal = ({
  open,
  onClose,
  investor,
  token,
  API_URL,
  onSuccess
}) => {
  const [allFunds, setAllFunds] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state - array of fund assignments
  const [fundAssignments, setFundAssignments] = useState([
    { fund_id: '', assigned_manager_id: '', initial_stage_id: '', managers: [], stages: [] }
  ]);
  
  // Cache for fund managers and stages per fund
  const [fundManagersCache, setFundManagersCache] = useState({});
  const [fundStagesCache, setFundStagesCache] = useState({});

  // Fetch initial data
  useEffect(() => {
    if (open && investor) {
      fetchInitialData();
    }
  }, [open, investor]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch all funds (admin sees all)
      const fundsRes = await axios.get(`${API_URL}/api/funds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllFunds(fundsRes.data || []);
      
      // Fetch existing assignments for this investor
      const assignmentsRes = await axios.get(
        `${API_URL}/api/investors/${investor.id}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExistingAssignments(assignmentsRes.data.assignments || []);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load fund data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch fund managers when a fund is selected
  const fetchFundManagers = async (fundId) => {
    if (fundManagersCache[fundId]) {
      return fundManagersCache[fundId];
    }
    
    try {
      const res = await axios.get(
        `${API_URL}/api/admin/funds/${fundId}/fund-managers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const managers = res.data.fund_managers || [];
      setFundManagersCache(prev => ({ ...prev, [fundId]: managers }));
      return managers;
    } catch (error) {
      console.error('Failed to fetch fund managers:', error);
      return [];
    }
  };

  // Fetch pipeline stages when a fund is selected
  const fetchPipelineStages = async (fundId) => {
    if (fundStagesCache[fundId]) {
      return fundStagesCache[fundId];
    }
    
    try {
      const res = await axios.get(
        `${API_URL}/api/funds/${fundId}/pipeline-stages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const stages = res.data || [];
      setFundStagesCache(prev => ({ ...prev, [fundId]: stages }));
      return stages;
    } catch (error) {
      console.error('Failed to fetch pipeline stages:', error);
      return [];
    }
  };

  // Handle fund selection change
  const handleFundChange = async (index, fundId) => {
    const newAssignments = [...fundAssignments];
    newAssignments[index] = {
      ...newAssignments[index],
      fund_id: fundId,
      assigned_manager_id: '',
      initial_stage_id: '',
      managers: [],
      stages: []
    };
    setFundAssignments(newAssignments);
    
    // Fetch managers and stages for this fund
    if (fundId) {
      const [managers, stages] = await Promise.all([
        fetchFundManagers(fundId),
        fetchPipelineStages(fundId)
      ]);
      
      newAssignments[index].managers = managers;
      newAssignments[index].stages = stages;
      
      // Auto-select "Investors" stage as default
      const investorsStage = stages.find(s => s.name === 'Investors');
      if (investorsStage) {
        newAssignments[index].initial_stage_id = investorsStage.id;
      }
      
      setFundAssignments([...newAssignments]);
    }
  };

  // Add another fund assignment row
  const addFundRow = () => {
    setFundAssignments([
      ...fundAssignments,
      { fund_id: '', assigned_manager_id: '', initial_stage_id: '', managers: [], stages: [] }
    ]);
  };

  // Remove a fund assignment row
  const removeFundRow = (index) => {
    if (fundAssignments.length === 1) return;
    setFundAssignments(fundAssignments.filter((_, i) => i !== index));
  };

  // Check if fund is already assigned
  const isFundAlreadyAssigned = (fundId) => {
    return existingAssignments.some(a => a.fund_id === fundId);
  };

  // Check if fund is selected in another row
  const isFundSelectedElsewhere = (fundId, currentIndex) => {
    return fundAssignments.some((a, i) => i !== currentIndex && a.fund_id === fundId);
  };

  // Get available funds (not already assigned)
  const getAvailableFunds = (currentIndex) => {
    return allFunds.filter(fund => {
      const isAlreadyAssigned = isFundAlreadyAssigned(fund.id);
      const isSelectedElsewhere = isFundSelectedElsewhere(fund.id, currentIndex);
      return !isAlreadyAssigned && !isSelectedElsewhere;
    });
  };

  // Handle unassign from fund
  const handleUnassign = async (assignmentId, fundName) => {
    if (!confirm(`Are you sure you want to unassign "${investor.investor_name}" from ${fundName}? This will remove their pipeline entry and any fund-specific data.`)) {
      return;
    }
    
    try {
      await axios.delete(
        `${API_URL}/api/admin/investor-fund-assignments/${assignmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Unassigned from ${fundName}`);
      // Refresh assignments
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unassign from fund');
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Filter out empty assignments
    const validAssignments = fundAssignments.filter(a => a.fund_id);
    
    if (validAssignments.length === 0) {
      toast.error('Please select at least one fund');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        investor_id: investor.id,
        fund_assignments: validAssignments.map(a => ({
          fund_id: a.fund_id,
          assigned_manager_id: a.assigned_manager_id || null,
          initial_stage_id: a.initial_stage_id || null
        }))
      };
      
      const response = await axios.post(
        `${API_URL}/api/admin/investor-fund-assignments`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const result = response.data;
      
      if (result.created_assignments?.length > 0) {
        toast.success(result.message);
      }
      
      if (result.already_assigned?.length > 0) {
        result.already_assigned.forEach(item => {
          toast.warning(`${item.fund_name}: ${item.reason}`);
        });
      }
      
      onSuccess && onSuccess(result);
      onClose();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign investor to funds');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when closing
  const handleClose = () => {
    setFundAssignments([
      { fund_id: '', assigned_manager_id: '', initial_stage_id: '', managers: [], stages: [] }
    ]);
    onClose();
  };

  if (!investor) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold flex items-center gap-2 text-xl">
            <Briefcase className="h-5 w-5 text-[#00A3FF]" />
            Assign to Fund
          </DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            Assign <span className="text-white font-medium">{investor.investor_name}</span> to 
            one or more funds. Each fund assignment creates a separate pipeline entry.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0047AB]" />
          </div>
        ) : (
          <div className="py-4 space-y-6">
            {/* Existing Assignments - with Unassign capability */}
            {existingAssignments.length > 0 && (
              <div className="space-y-3">
                <Label className="text-white font-medium">Current Fund Assignments:</Label>
                <div className="space-y-2">
                  {existingAssignments.map(assignment => (
                    <div 
                      key={assignment.id || `${assignment.fund_id}-${assignment.investor_id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#1A2744] bg-[#02040A]/40"
                    >
                      <div className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-[#22C55E]" />
                        <div>
                          <p className="text-white font-medium">{assignment.fund_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {assignment.is_legacy && (
                              <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-0 text-xs">
                                Original
                              </Badge>
                            )}
                            {assignment.assigned_manager_name && (
                              <span className="text-xs text-[#94A3B8]">
                                Owner: {assignment.assigned_manager_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!assignment.is_legacy && assignment.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassign(assignment.id, assignment.fund_name)}
                          className="h-8 px-3 text-[#EF4444] hover:text-white hover:bg-[#EF4444]/20"
                          data-testid={`unassign-${assignment.fund_id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      )}
                      {assignment.is_legacy && (
                        <span className="text-xs text-[#94A3B8] italic">Cannot unassign original</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Assignments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white font-medium">Add Fund Assignments:</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFundRow}
                  className="bg-transparent border-[#1A2744] text-[#00A3FF] hover:bg-[#0047AB]/20"
                  data-testid="add-fund-row"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Fund
                </Button>
              </div>

              <AnimatePresence>
                {fundAssignments.map((assignment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border border-[#1A2744] rounded-lg p-4 space-y-4"
                    style={{ background: 'rgba(10, 22, 40, 0.6)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#94A3B8]">Assignment {index + 1}</span>
                      {fundAssignments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFundRow(index)}
                          className="h-8 w-8 p-0 text-[#EF4444] hover:text-white hover:bg-[#EF4444]/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fund Selection */}
                      <div className="space-y-2">
                        <Label className="text-white flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          Target Fund <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Select
                          value={assignment.fund_id}
                          onValueChange={(value) => handleFundChange(index, value)}
                        >
                          <SelectTrigger 
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                            data-testid={`select-fund-${index}`}
                          >
                            <SelectValue placeholder="Select fund" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                            {getAvailableFunds(index).map(fund => (
                              <SelectItem 
                                key={fund.id} 
                                value={fund.id}
                                className="text-white focus:bg-[#0047AB]/20"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{fund.name}</span>
                                  <span className="text-xs text-[#94A3B8]">({fund.fund_type})</span>
                                </div>
                              </SelectItem>
                            ))}
                            {getAvailableFunds(index).length === 0 && (
                              <div className="px-2 py-3 text-[#94A3B8] text-sm">
                                No available funds
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fund Manager Selection */}
                      <div className="space-y-2">
                        <Label className="text-white flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Fund Manager Owner
                        </Label>
                        <Select
                          value={assignment.assigned_manager_id || 'none'}
                          onValueChange={(value) => {
                            const newAssignments = [...fundAssignments];
                            newAssignments[index].assigned_manager_id = value === 'none' ? '' : value;
                            setFundAssignments(newAssignments);
                          }}
                          disabled={!assignment.fund_id}
                        >
                          <SelectTrigger 
                            className="bg-[#02040A]/60 border-[#1A2744] text-white disabled:opacity-50"
                            data-testid={`select-manager-${index}`}
                          >
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                            <SelectItem value="none" className="text-white focus:bg-[#0047AB]/20">
                              No specific owner
                            </SelectItem>
                            {assignment.managers?.map(manager => (
                              <SelectItem 
                                key={manager.id} 
                                value={manager.id}
                                className="text-white focus:bg-[#0047AB]/20"
                              >
                                {manager.first_name} {manager.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Initial Stage Selection */}
                      <div className="space-y-2">
                        <Label className="text-white flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          Initial Pipeline Stage
                        </Label>
                        <Select
                          value={assignment.initial_stage_id || 'default'}
                          onValueChange={(value) => {
                            const newAssignments = [...fundAssignments];
                            newAssignments[index].initial_stage_id = value === 'default' ? '' : value;
                            setFundAssignments(newAssignments);
                          }}
                          disabled={!assignment.fund_id}
                        >
                          <SelectTrigger 
                            className="bg-[#02040A]/60 border-[#1A2744] text-white disabled:opacity-50"
                            data-testid={`select-stage-${index}`}
                          >
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                            {assignment.stages?.map(stage => (
                              <SelectItem 
                                key={stage.id} 
                                value={stage.id}
                                className="text-white focus:bg-[#0047AB]/20"
                              >
                                {stage.name}
                                {stage.name === 'Investors' && (
                                  <span className="ml-2 text-xs text-[#94A3B8]">(Default)</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Warning if fund already assigned */}
                    {assignment.fund_id && isFundAlreadyAssigned(assignment.fund_id) && (
                      <div className="flex items-center gap-2 p-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded">
                        <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
                        <span className="text-sm text-[#F59E0B]">
                          Already assigned to this fund
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Info Note */}
            <div className="p-3 bg-[#0047AB]/10 border border-[#0047AB]/30 rounded-lg">
              <p className="text-sm text-[#00A3FF]">
                <strong>Note:</strong> Each fund assignment creates an independent pipeline entry. 
                Pipeline stage, tasks, and capital data are tracked separately per fund.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || !fundAssignments.some(a => a.fund_id)}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
            data-testid="confirm-assign-to-fund"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Assign to Fund{fundAssignments.filter(a => a.fund_id).length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignToFundModal;
