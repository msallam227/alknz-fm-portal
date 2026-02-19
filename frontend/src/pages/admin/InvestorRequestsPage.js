import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  ChevronDown,
  Filter,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const InvestorRequestsPage = () => {
  const { token, API_URL } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [counts, setCounts] = useState({ pending: 0, approved: 0, denied: 0 });
  
  // Approve/Deny dialogs
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Fund managers for override
  const [fundManagers, setFundManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await axios.get(
        `${API_URL}/api/admin/investor-requests${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRequests(response.data.requests || []);
      setCounts(response.data.counts || { pending: 0, approved: 0, denied: 0 });
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token, API_URL]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchFundManagers = async (fundId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/funds/${fundId}/fund-managers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFundManagers(response.data.fund_managers || []);
    } catch (error) {
      setFundManagers([]);
    }
  };

  const handleOpenApprove = async (request) => {
    setSelectedRequest(request);
    setSelectedManager(request.requested_by_user_id); // Default to requester
    await fetchFundManagers(request.requested_fund_id);
    setShowApproveDialog(true);
  };

  const handleOpenDeny = (request) => {
    setSelectedRequest(request);
    setDenialReason('');
    setShowDenyDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const params = new URLSearchParams();
      if (selectedManager) params.append('assigned_manager_id', selectedManager);
      
      await axios.put(
        `${API_URL}/api/admin/investor-requests/${selectedRequest.id}/approve?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Approved: ${selectedRequest.investor_name} → ${selectedRequest.fund_name}`);
      setShowApproveDialog(false);
      setSelectedRequest(null);
      fetchRequests();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const params = new URLSearchParams();
      if (denialReason) params.append('denial_reason', denialReason);
      
      await axios.put(
        `${API_URL}/api/admin/investor-requests/${selectedRequest.id}/deny?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Denied: ${selectedRequest.investor_name}`);
      setShowDenyDialog(false);
      setSelectedRequest(null);
      setDenialReason('');
      fetchRequests();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to deny request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-0"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge className="bg-[#EF4444]/20 text-[#EF4444] border-0"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="investor-requests-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Investor Assignment Requests</h1>
          <p className="text-[#94A3B8] mt-1">Review and approve fund manager requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.button
          onClick={() => setStatusFilter('pending')}
          className={`border rounded-xl p-4 text-left transition-all ${
            statusFilter === 'pending' 
              ? 'border-[#F59E0B] bg-[#F59E0B]/10' 
              : 'border-[#1A2744] hover:border-[#F59E0B]/50'
          }`}
          style={{ background: statusFilter === 'pending' ? undefined : 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
          data-testid="filter-pending"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[#94A3B8] text-sm">Pending</p>
              <p className="text-2xl font-bold text-white">{counts.pending}</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setStatusFilter('approved')}
          className={`border rounded-xl p-4 text-left transition-all ${
            statusFilter === 'approved' 
              ? 'border-[#22C55E] bg-[#22C55E]/10' 
              : 'border-[#1A2744] hover:border-[#22C55E]/50'
          }`}
          style={{ background: statusFilter === 'approved' ? undefined : 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
          data-testid="filter-approved"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/20">
              <CheckCircle className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-[#94A3B8] text-sm">Approved</p>
              <p className="text-2xl font-bold text-white">{counts.approved}</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setStatusFilter('denied')}
          className={`border rounded-xl p-4 text-left transition-all ${
            statusFilter === 'denied' 
              ? 'border-[#EF4444] bg-[#EF4444]/10' 
              : 'border-[#1A2744] hover:border-[#EF4444]/50'
          }`}
          style={{ background: statusFilter === 'denied' ? undefined : 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
          data-testid="filter-denied"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444]/20">
              <XCircle className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[#94A3B8] text-sm">Denied</p>
              <p className="text-2xl font-bold text-white">{counts.denied}</p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Requests Table */}
      <div 
        className="border border-[#1A2744] rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0047AB]" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 text-[#475569] mx-auto mb-3" />
            <p className="text-[#94A3B8]">No {statusFilter !== 'all' ? statusFilter : ''} requests</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#1A2744] hover:bg-transparent">
                <TableHead className="text-[#94A3B8]">Investor</TableHead>
                <TableHead className="text-[#94A3B8]">Requested Fund</TableHead>
                <TableHead className="text-[#94A3B8]">Requested By</TableHead>
                <TableHead className="text-[#94A3B8]">Reason</TableHead>
                <TableHead className="text-[#94A3B8]">Date</TableHead>
                <TableHead className="text-[#94A3B8]">Status</TableHead>
                {statusFilter === 'pending' && (
                  <TableHead className="text-[#94A3B8] w-[150px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request, idx) => (
                <TableRow 
                  key={request.id}
                  className="border-[#1A2744] hover:bg-[#0047AB]/10"
                >
                  <TableCell>
                    <div>
                      <p className="text-white font-medium">{request.investor_name}</p>
                      <p className="text-xs text-[#94A3B8]">{request.investor_type}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-[#0047AB]/20 text-[#00A3FF] border-0">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {request.fund_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#94A3B8]" />
                      <span className="text-[#94A3B8]">{request.requested_by_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.reason ? (
                      <p className="text-[#94A3B8] text-sm max-w-[200px] truncate">
                        {request.reason}
                      </p>
                    ) : (
                      <span className="text-[#475569]">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-[#94A3B8] text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(request.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                    {request.status === 'denied' && request.denial_reason && (
                      <p className="text-xs text-[#EF4444] mt-1 max-w-[150px] truncate">
                        {request.denial_reason}
                      </p>
                    )}
                  </TableCell>
                  {statusFilter === 'pending' && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenApprove(request)}
                          className="h-8 px-3 bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30"
                          data-testid={`approve-request-${request.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDeny(request)}
                          className="h-8 px-3 text-[#EF4444] hover:bg-[#EF4444]/20"
                          data-testid={`deny-request-${request.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#22C55E]" />
              Approve Request
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Approve assignment of <span className="text-white font-medium">{selectedRequest?.investor_name}</span> to{' '}
              <span className="text-white font-medium">{selectedRequest?.fund_name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-3 bg-[#02040A]/40 rounded-lg border border-[#1A2744]">
              <p className="text-sm text-[#94A3B8]">
                Requested by: <span className="text-white">{selectedRequest?.requested_by_name}</span>
              </p>
              {selectedRequest?.reason && (
                <p className="text-sm text-[#94A3B8] mt-1">
                  Reason: <span className="text-white">{selectedRequest.reason}</span>
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Assign Owner (Fund Manager)</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white">
                  <SelectValue placeholder="Select fund manager" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                  {fundManagers.map(fm => (
                    <SelectItem key={fm.id} value={fm.id} className="text-white">
                      {fm.first_name} {fm.last_name}
                      {fm.id === selectedRequest?.requested_by_user_id && (
                        <span className="ml-2 text-xs text-[#94A3B8]">(Requester)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#475569]">
                The investor will be added to the "Investors" pipeline stage
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-[#22C55E] hover:bg-[#22C55E]/80 text-white"
              data-testid="confirm-approve"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-[#EF4444]" />
              Deny Request
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Deny assignment of <span className="text-white font-medium">{selectedRequest?.investor_name}</span> to{' '}
              <span className="text-white font-medium">{selectedRequest?.fund_name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Denial Reason (Optional)</Label>
              <Textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="Explain why this request is being denied..."
                className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[80px]"
              />
              <p className="text-xs text-[#475569]">
                This reason will be visible to the requesting fund manager
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDenyDialog(false)}
              className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeny}
              disabled={processing}
              className="bg-[#EF4444] hover:bg-[#EF4444]/80 text-white"
              data-testid="confirm-deny"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Denying...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Deny
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvestorRequestsPage;
