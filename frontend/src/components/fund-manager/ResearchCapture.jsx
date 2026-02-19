import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ExternalLink, Check, X, Trash2, 
  User, Building2, MapPin, Mail, Phone, Globe, Linkedin,
  Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, Download, CloudDownload, Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { getInitials } from './constants';

const statusColors = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
  accepted: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle }
};

export const ResearchCapture = ({
  selectedFund,
  token,
  API_URL,
  onInvestorCreated,
  onNavigateToInvestor
}) => {
  const [captures, setCaptures] = useState([]);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [apiConnected, setApiConnected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Check API connection on mount
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/external-captures/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setApiConnected(res.data.success);
      } catch {
        setApiConnected(false);
      }
    };
    if (token) checkApiConnection();
  }, [token, API_URL]);

  // Sync captures from external API
  const syncFromExternalApi = async () => {
    if (!selectedFund?.id) return;
    
    setSyncing(true);
    try {
      const res = await axios.get(`${API_URL}/api/external-captures/sync`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { fund_id: selectedFund.id }
      });
      
      if (res.data.imported > 0) {
        toast.success(`Imported ${res.data.imported} new entries from ALKNZ API`);
        fetchCaptures(); // Refresh local list
      } else if (res.data.skipped > 0) {
        toast.info(`${res.data.skipped} entries already imported`);
      } else {
        toast.info('No data found in ALKNZ API (both captures and Address Book are empty)');
      }
      
      // Log any errors from sync
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn('Sync warnings:', res.data.errors);
      }
    } catch (err) {
      toast.error('Failed to sync from ALKNZ API');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch captures
  const fetchCaptures = async () => {
    if (!selectedFund?.id || !token) return;
    
    setLoading(true);
    try {
      const params = { fund_id: selectedFund.id };
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const res = await axios.get(`${API_URL}/api/research-capture`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setCaptures(res.data.captures);
      setStats({
        total: res.data.total,
        pending: res.data.pending,
        accepted: res.data.accepted,
        rejected: res.data.rejected
      });
    } catch (err) {
      toast.error('Failed to fetch research captures');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptures();
  }, [selectedFund?.id, statusFilter, token]);

  // Filter captures by search
  const filteredCaptures = captures.filter(c => 
    c.investor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.firm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.source_url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle accept - creates investor in the currently selected fund
  const handleAccept = async (capture) => {
    if (!selectedFund?.id) {
      toast.error('Please select a fund first');
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/research-capture/${capture.id}/accept`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { fund_id: selectedFund.id }  // Pass the selected fund
        }
      );
      toast.success(`Created investor "${res.data.investor_name}" in ${res.data.fund_name || selectedFund.name}`);
      fetchCaptures();
      setSelectedCapture(null);
      onInvestorCreated?.(res.data);
      onNavigateToInvestor?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept capture');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async (capture) => {
    setIsProcessing(true);
    try {
      await axios.post(
        `${API_URL}/api/research-capture/${capture.id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Research capture rejected');
      fetchCaptures();
      setSelectedCapture(null);
    } catch (err) {
      toast.error('Failed to reject capture');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete
  const handleDelete = async (capture) => {
    setIsProcessing(true);
    try {
      await axios.delete(`${API_URL}/api/research-capture/${capture.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Research capture deleted');
      fetchCaptures();
      if (selectedCapture?.id === capture.id) {
        setSelectedCapture(null);
      }
    } catch (err) {
      toast.error('Failed to delete capture');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    setIsProcessing(true);
    try {
      await axios.put(
        `${API_URL}/api/research-capture/${selectedCapture.id}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Changes saved');
      fetchCaptures();
      setIsEditing(false);
      // Refresh selected capture
      const updated = await axios.get(
        `${API_URL}/api/research-capture/${selectedCapture.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedCapture(updated.data);
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setIsProcessing(false);
    }
  };

  const startEdit = () => {
    setEditData({
      investor_name: selectedCapture.investor_name || '',
      firm_name: selectedCapture.firm_name || '',
      investor_type: selectedCapture.investor_type || '',
      country: selectedCapture.country || '',
      city: selectedCapture.city || '',
      contact_email: selectedCapture.contact_email || '',
      contact_phone: selectedCapture.contact_phone || '',
      linkedin_url: selectedCapture.linkedin_url || '',
      website_url: selectedCapture.website_url || '',
      job_title: selectedCapture.job_title || '',
      notes: selectedCapture.notes || ''
    });
    setIsEditing(true);
  };

  return (
    <div className="flex h-full" data-testid="research-capture-tab">
      {/* Left Side: Filters + List */}
      <div className="w-[400px] border-r border-[#1A2744] flex flex-col flex-shrink-0" 
        style={{ background: 'rgba(2, 4, 10, 0.5)' }}>
        
        {/* Header with Stats */}
        <div className="p-4 border-b border-[#1A2744]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#00A3FF]" />
              Research Captures
              {/* API Connection Status */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${
                      apiConnected === null ? 'bg-gray-500' : 
                      apiConnected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{apiConnected === null ? 'Checking API...' : 
                        apiConnected ? 'ALKNZ Replit API Connected' : 'API Disconnected'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h2>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={syncFromExternalApi}
                      disabled={syncing || !apiConnected}
                      className="text-[#00A3FF] border-[#1A2744] hover:bg-[#0047AB]/20 h-8 px-2"
                      data-testid="sync-external-btn"
                    >
                      <CloudDownload className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sync from Chrome Extension</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchCaptures}
                className="text-[#94A3B8] hover:text-white h-8 w-8 p-0"
                data-testid="refresh-captures"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Status Stats */}
          <div className="flex gap-2 mb-3">
            <Badge 
              variant="outline" 
              className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-[#0047AB]/30 border-[#0047AB]' : 'border-[#1A2744]'}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({stats.total})
            </Badge>
            <Badge 
              variant="outline" 
              className={`cursor-pointer transition-colors ${statusFilter === 'pending' ? 'bg-yellow-500/30 border-yellow-500' : 'border-[#1A2744] text-yellow-400'}`}
              onClick={() => setStatusFilter('pending')}
            >
              <Clock className="h-3 w-3 mr-1" />
              {stats.pending}
            </Badge>
            <Badge 
              variant="outline" 
              className={`cursor-pointer transition-colors ${statusFilter === 'accepted' ? 'bg-green-500/30 border-green-500' : 'border-[#1A2744] text-green-400'}`}
              onClick={() => setStatusFilter('accepted')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.accepted}
            </Badge>
            <Badge 
              variant="outline" 
              className={`cursor-pointer transition-colors ${statusFilter === 'rejected' ? 'bg-red-500/30 border-red-500' : 'border-[#1A2744] text-red-400'}`}
              onClick={() => setStatusFilter('rejected')}
            >
              <XCircle className="h-3 w-3 mr-1" />
              {stats.rejected}
            </Badge>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569]"
              data-testid="search-captures"
            />
          </div>
        </div>
        
        {/* Capture List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0047AB]"></div>
            </div>
          ) : filteredCaptures.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-[#94A3B8] text-sm">No research captures found</p>
              <p className="text-[#475569] text-xs mt-1">
                Use the Chrome extension to capture investor data
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCaptures.map(capture => {
                const StatusIcon = statusColors[capture.status]?.icon || Clock;
                return (
                  <div
                    key={capture.id}
                    onClick={() => { setSelectedCapture(capture); setIsEditing(false); }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCapture?.id === capture.id
                        ? 'bg-[#0047AB]/20 border border-[#0047AB]'
                        : 'hover:bg-[#0047AB]/10 border border-transparent'
                    }`}
                    data-testid={`capture-item-${capture.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-[#002D72] text-white text-sm">
                          {getInitials(capture.investor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">
                            {capture.investor_name || 'Unknown'}
                          </p>
                          <Badge className={`${statusColors[capture.status]?.bg} ${statusColors[capture.status]?.text} text-[10px] px-1.5`}>
                            <StatusIcon className="h-3 w-3 mr-0.5" />
                            {capture.status}
                          </Badge>
                        </div>
                        {capture.firm_name && (
                          <p className="text-[#94A3B8] text-xs truncate">{capture.firm_name}</p>
                        )}
                        <p className="text-[#475569] text-[10px] mt-1 truncate">
                          {new Date(capture.created_at).toLocaleDateString()}
                          {capture.source_url && ` • ${new URL(capture.source_url).hostname}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Right Side: Detail Panel */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!selectedCapture ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center h-full min-h-[400px]"
            >
              <div className="text-center">
                <Globe className="h-16 w-16 text-[#94A3B8] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Select a Capture</h2>
                <p className="text-[#94A3B8]">Choose a research capture to view details</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedCapture.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              {/* Detail Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-[#0047AB] text-white text-xl">
                      {getInitials(selectedCapture.investor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {selectedCapture.investor_name || 'Unknown'}
                    </h1>
                    <p className="text-[#94A3B8]">
                      {selectedCapture.firm_name}
                      {selectedCapture.investor_type && ` • ${selectedCapture.investor_type}`}
                    </p>
                    <Badge className={`mt-1 ${statusColors[selectedCapture.status]?.bg} ${statusColors[selectedCapture.status]?.text}`}>
                      {selectedCapture.status.charAt(0).toUpperCase() + selectedCapture.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {selectedCapture.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          className="border-[#1A2744] text-[#94A3B8]"
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveEdit}
                          className="bg-[#0047AB] hover:bg-[#0052CC] text-white"
                          disabled={isProcessing}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={startEdit}
                          className="border-[#1A2744] text-white"
                          data-testid="edit-capture-btn"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(selectedCapture)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          disabled={isProcessing}
                          data-testid="reject-capture-btn"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleAccept(selectedCapture)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={isProcessing}
                          data-testid="accept-capture-btn"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(selectedCapture)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          disabled={isProcessing}
                          data-testid="delete-capture-btn"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {selectedCapture.status !== 'pending' && (
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(selectedCapture)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    disabled={isProcessing}
                    data-testid="delete-capture-btn"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
              
              {/* Detail Content */}
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-[#0A1628]/50 rounded-lg p-4 border border-[#1A2744]">
                  <h3 className="text-sm font-semibold text-[#00A3FF] mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Investor Name *</label>
                          <Input
                            value={editData.investor_name}
                            onChange={(e) => setEditData({...editData, investor_name: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Firm Name</label>
                          <Input
                            value={editData.firm_name}
                            onChange={(e) => setEditData({...editData, firm_name: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Job Title</label>
                          <Input
                            value={editData.job_title}
                            onChange={(e) => setEditData({...editData, job_title: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Investor Type</label>
                          <Input
                            value={editData.investor_type}
                            onChange={(e) => setEditData({...editData, investor_type: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Email</label>
                          <Input
                            type="email"
                            value={editData.contact_email}
                            onChange={(e) => setEditData({...editData, contact_email: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Phone</label>
                          <Input
                            value={editData.contact_phone}
                            onChange={(e) => setEditData({...editData, contact_phone: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <DetailField icon={User} label="Investor Name" value={selectedCapture.investor_name} />
                        <DetailField icon={Building2} label="Firm Name" value={selectedCapture.firm_name} />
                        <DetailField icon={User} label="Job Title" value={selectedCapture.job_title} />
                        <DetailField label="Investor Type" value={selectedCapture.investor_type} />
                        <DetailField icon={Mail} label="Email" value={selectedCapture.contact_email} />
                        <DetailField icon={Phone} label="Phone" value={selectedCapture.contact_phone} />
                      </>
                    )}
                  </div>
                </div>
                
                {/* Location */}
                <div className="bg-[#0A1628]/50 rounded-lg p-4 border border-[#1A2744]">
                  <h3 className="text-sm font-semibold text-[#00A3FF] mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Country</label>
                          <Input
                            value={editData.country}
                            onChange={(e) => setEditData({...editData, country: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">City</label>
                          <Input
                            value={editData.city}
                            onChange={(e) => setEditData({...editData, city: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <DetailField icon={MapPin} label="Country" value={selectedCapture.country} />
                        <DetailField label="City" value={selectedCapture.city} />
                      </>
                    )}
                  </div>
                </div>
                
                {/* Online Presence */}
                <div className="bg-[#0A1628]/50 rounded-lg p-4 border border-[#1A2744]">
                  <h3 className="text-sm font-semibold text-[#00A3FF] mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Online Presence
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">LinkedIn URL</label>
                          <Input
                            value={editData.linkedin_url}
                            onChange={(e) => setEditData({...editData, linkedin_url: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#94A3B8] mb-1 block">Website URL</label>
                          <Input
                            value={editData.website_url}
                            onChange={(e) => setEditData({...editData, website_url: e.target.value})}
                            className="bg-[#02040A]/60 border-[#1A2744] text-white"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <DetailField 
                          icon={Linkedin} 
                          label="LinkedIn" 
                          value={selectedCapture.linkedin_url} 
                          isLink 
                        />
                        <DetailField 
                          icon={Globe} 
                          label="Website" 
                          value={selectedCapture.website_url} 
                          isLink 
                        />
                      </>
                    )}
                  </div>
                </div>
                
                {/* Notes */}
                {(selectedCapture.notes || isEditing) && (
                  <div className="bg-[#0A1628]/50 rounded-lg p-4 border border-[#1A2744]">
                    <h3 className="text-sm font-semibold text-[#00A3FF] mb-3">Notes</h3>
                    {isEditing ? (
                      <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData({...editData, notes: e.target.value})}
                        rows={4}
                        className="w-full bg-[#02040A]/60 border border-[#1A2744] rounded-md text-white p-3 text-sm"
                        placeholder="Add notes..."
                      />
                    ) : (
                      <p className="text-[#94A3B8] text-sm whitespace-pre-wrap">{selectedCapture.notes}</p>
                    )}
                  </div>
                )}
                
                {/* Source Info */}
                <div className="bg-[#0A1628]/50 rounded-lg p-4 border border-[#1A2744]">
                  <h3 className="text-sm font-semibold text-[#00A3FF] mb-3">Capture Source</h3>
                  <div className="space-y-2">
                    {selectedCapture.source_url && (
                      <a 
                        href={selectedCapture.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#00A3FF] hover:underline text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {selectedCapture.source_page_title || selectedCapture.source_url}
                      </a>
                    )}
                    <p className="text-[#475569] text-xs">
                      Captured by {selectedCapture.captured_by_name || 'Unknown'} on {new Date(selectedCapture.created_at).toLocaleString()}
                    </p>
                    {selectedCapture.processed_at && (
                      <p className="text-[#475569] text-xs">
                        {selectedCapture.status === 'accepted' ? 'Accepted' : 'Rejected'} by {selectedCapture.processed_by_name || 'Unknown'} on {new Date(selectedCapture.processed_at).toLocaleString()}
                      </p>
                    )}
                    {selectedCapture.created_investor_id && (
                      <Badge className="bg-green-500/20 text-green-400 mt-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Investor profile created
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper component for displaying field details
const DetailField = ({ icon: Icon, label, value, isLink }) => (
  <div>
    <p className="text-xs text-[#475569] mb-1 flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </p>
    {isLink && value ? (
      <a 
        href={value} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-[#00A3FF] hover:underline text-sm truncate block"
      >
        {value}
      </a>
    ) : (
      <p className="text-white text-sm">{value || '-'}</p>
    )}
  </div>
);

export default ResearchCapture;
