import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Users,
  MapPin,
  Building,
  Briefcase,
  Plus,
  X,
  Filter,
  ChevronDown,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { toast } from 'sonner';

const GlobalInvestorBrowser = ({
  open,
  onClose,
  selectedFund,
  token,
  API_URL,
  onRequestSuccess
}) => {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [filterOptions, setFilterOptions] = useState({ investor_types: [], countries: [] });
  
  // Request dialog
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // My requests
  const [myRequests, setMyRequests] = useState([]);
  const [showMyRequests, setShowMyRequests] = useState(false);

  const fetchInvestors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter !== 'all') params.append('investor_type', typeFilter);
      if (countryFilter !== 'all') params.append('country', countryFilter);
      
      const response = await axios.get(
        `${API_URL}/api/global-investors?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setInvestors(response.data.investors || []);
      setFilterOptions(response.data.filter_options || { investor_types: [], countries: [] });
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      toast.error('Failed to load investors');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, countryFilter, token, API_URL]);

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/investor-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchInvestors();
      fetchMyRequests();
    }
  }, [open, fetchInvestors]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) fetchInvestors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, countryFilter]);

  const handleRequestInvestor = (investor) => {
    // Check if already assigned to this fund
    if (selectedFund && investor.assigned_fund_names?.includes(selectedFund.name)) {
      toast.error(`${investor.investor_name} is already assigned to ${selectedFund.name}`);
      return;
    }
    
    // Check if already has pending request
    const existingRequest = myRequests.find(
      r => r.investor_id === investor.id && 
           r.requested_fund_id === selectedFund?.id && 
           r.status === 'pending'
    );
    if (existingRequest) {
      toast.info('You already have a pending request for this investor');
      return;
    }
    
    setSelectedInvestor(investor);
    setRequestReason('');
    setShowRequestDialog(true);
  };

  const submitRequest = async () => {
    if (!selectedInvestor || !selectedFund) return;
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/investor-requests`,
        {
          investor_id: selectedInvestor.id,
          requested_fund_id: selectedFund.id,
          reason: requestReason || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Request submitted for ${selectedInvestor.investor_name}`);
      setShowRequestDialog(false);
      setSelectedInvestor(null);
      fetchMyRequests();
      onRequestSuccess && onRequestSuccess();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getRequestStatus = (investorId) => {
    const request = myRequests.find(
      r => r.investor_id === investorId && r.requested_fund_id === selectedFund?.id
    );
    return request;
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
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent 
          side="right" 
          className="w-[700px] sm:max-w-[700px] bg-[#0A1628] border-l border-[#1A2744] text-white overflow-y-auto p-0"
        >
          <div className="sticky top-0 z-10 bg-[#0A1628] border-b border-[#1A2744] p-6">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-[#00A3FF]" />
                Browse Global Investors
              </SheetTitle>
              <SheetDescription className="text-[#94A3B8]">
                Search and request investors to add to <span className="text-white font-medium">{selectedFund?.name}</span>
              </SheetDescription>
            </SheetHeader>

            {/* Search and Filters */}
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <Input
                  placeholder="Search by name, title, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569]"
                  data-testid="global-investor-search"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                    <SelectItem value="all" className="text-white">All Types</SelectItem>
                    {filterOptions.investor_types.map(type => (
                      <SelectItem key={type} value={type} className="text-white">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white w-[150px]">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                    <SelectItem value="all" className="text-white">All Countries</SelectItem>
                    {filterOptions.countries.map(country => (
                      <SelectItem key={country} value={country} className="text-white">{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMyRequests(!showMyRequests)}
                  className={`ml-auto ${showMyRequests ? 'bg-[#0047AB]/20 border-[#0047AB]' : 'bg-transparent border-[#1A2744]'} text-white`}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  My Requests ({myRequests.filter(r => r.status === 'pending').length})
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {showMyRequests ? (
              /* My Requests Tab */
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#94A3B8]">Your Investor Requests</h3>
                {myRequests.length === 0 ? (
                  <div className="text-center py-8 text-[#94A3B8]">
                    No requests yet
                  </div>
                ) : (
                  myRequests.map(request => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border border-[#1A2744] bg-[#02040A]/40"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{request.investor_name}</p>
                          <p className="text-sm text-[#94A3B8]">
                            Requested for: {request.fund_name}
                          </p>
                          {request.reason && (
                            <p className="text-xs text-[#475569] mt-1">
                              Reason: {request.reason}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      {request.status === 'denied' && request.denial_reason && (
                        <div className="mt-2 p-2 bg-[#EF4444]/10 rounded text-xs text-[#EF4444]">
                          Denial reason: {request.denial_reason}
                        </div>
                      )}
                      <p className="text-xs text-[#475569] mt-2">
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              /* Investors List */
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0047AB]" />
                  </div>
                ) : investors.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-[#475569] mx-auto mb-3" />
                    <p className="text-[#94A3B8]">No investors found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-[#94A3B8]">{investors.length} investors found</p>
                    {investors.map((investor, idx) => {
                      const existingRequest = getRequestStatus(investor.id);
                      const isAlreadyAssigned = selectedFund && investor.assigned_fund_names?.includes(selectedFund.name);
                      
                      return (
                        <motion.div
                          key={investor.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="p-4 rounded-lg border border-[#1A2744] bg-[#02040A]/40 hover:border-[#0047AB]/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium">{investor.investor_name}</p>
                                <Badge className="bg-[#1A2744] text-[#94A3B8] border-0 text-xs">
                                  {investor.investor_type || 'Individual'}
                                </Badge>
                              </div>
                              
                              {investor.job_title && (
                                <p className="text-sm text-[#94A3B8] mt-1 flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {investor.job_title}
                                </p>
                              )}
                              
                              {(investor.city || investor.country) && (
                                <p className="text-sm text-[#94A3B8] flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {investor.city && investor.country 
                                    ? `${investor.city}, ${investor.country}`
                                    : investor.city || investor.country
                                  }
                                </p>
                              )}
                              
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-[#0047AB]/20 text-[#00A3FF] border-0 text-xs">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {investor.assigned_funds_count} fund{investor.assigned_funds_count !== 1 ? 's' : ''}
                                </Badge>
                                {isAlreadyAssigned && (
                                  <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-0 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Already in {selectedFund.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {existingRequest ? (
                                getStatusBadge(existingRequest.status)
                              ) : isAlreadyAssigned ? (
                                <span className="text-xs text-[#22C55E]">Assigned</span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleRequestInvestor(investor)}
                                  className="text-white"
                                  style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                                  data-testid={`request-investor-${investor.id}`}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Request
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-[#00A3FF]" />
              Request Investor
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Request <span className="text-white font-medium">{selectedInvestor?.investor_name}</span> to 
              be assigned to <span className="text-white font-medium">{selectedFund?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-3 bg-[#02040A]/40 rounded-lg border border-[#1A2744]">
              <p className="text-white font-medium">{selectedInvestor?.investor_name}</p>
              <p className="text-sm text-[#94A3B8]">{selectedInvestor?.investor_type}</p>
              {selectedInvestor?.city && selectedInvestor?.country && (
                <p className="text-sm text-[#94A3B8]">
                  {selectedInvestor.city}, {selectedInvestor.country}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Reason (Optional)</Label>
              <Textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Why do you want to work with this investor?"
                className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[80px]"
              />
            </div>
            
            <div className="p-3 bg-[#0047AB]/10 border border-[#0047AB]/30 rounded-lg">
              <p className="text-sm text-[#00A3FF]">
                Your request will be sent to an admin for approval. Once approved, 
                the investor will appear in your fund's investor list and pipeline.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestDialog(false)}
              className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={submitRequest}
              disabled={submitting}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="submit-investor-request"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalInvestorBrowser;
