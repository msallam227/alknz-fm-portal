import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  AlertTriangle,
  Check,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Merge,
  Info,
  GitMerge
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import MergeCompareModal from '@/components/admin/MergeCompareModal';

const DuplicateInvestorsPage = () => {
  const { token, API_URL } = useAuth();
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showMergeCompare, setShowMergeCompare] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedKeep, setSelectedKeep] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/duplicate-investors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDuplicates(response.data.duplicates || []);
      setTotalDuplicates(response.data.total_duplicate_records || 0);
      setTotalGroups(response.data.total_duplicate_groups || 0);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
      toast.error('Failed to load duplicate investors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, [token, API_URL]);

  const toggleExpand = (name) => {
    setExpandedGroups(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const openMergeDialog = (group) => {
    setSelectedGroup(group);
    setSelectedKeep(group.investors[0]?.id); // Default to first (oldest)
    setShowMergeDialog(true);
  };

  const openMergeCompare = (group) => {
    setSelectedGroup(group);
    setShowMergeCompare(true);
  };

  const handleMerge = async () => {
    if (!selectedGroup || !selectedKeep) return;
    
    const deleteIds = selectedGroup.investors
      .filter(inv => inv.id !== selectedKeep)
      .map(inv => inv.id);
    
    setIsMerging(true);
    try {
      await axios.post(
        `${API_URL}/api/admin/merge-investors`,
        {
          keep_investor_id: selectedKeep,
          delete_investor_ids: deleteIds
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Investors merged successfully');
      setShowMergeDialog(false);
      setSelectedGroup(null);
      setSelectedKeep(null);
      await fetchDuplicates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to merge investors');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDelete = async (investorId, investorName) => {
    if (!confirm(`Are you sure you want to delete "${investorName}" and all related data?`)) {
      return;
    }
    
    try {
      await axios.delete(
        `${API_URL}/api/admin/investor/${investorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Investor deleted successfully');
      await fetchDuplicates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete investor');
    }
  };

  const filteredDuplicates = duplicates.filter(group => {
    const search = searchQuery.toLowerCase();
    return group.investor_name?.toLowerCase().includes(search);
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="duplicate-investors-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Duplicate Investors</h1>
          <p className="text-[#94A3B8] mt-1">Identify and merge duplicate investor records</p>
        </div>
        <Button
          onClick={fetchDuplicates}
          variant="outline"
          className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
          data-testid="refresh-duplicates"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#1A2744] rounded-xl p-6"
          style={{ background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${totalGroups > 0 ? 'bg-[#F59E0B]/20' : 'bg-[#22C55E]/20'}`}>
              <Users className={`h-6 w-6 ${totalGroups > 0 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`} />
            </div>
            <div>
              <p className="text-[#94A3B8] text-sm">Duplicate Groups</p>
              <p className="text-2xl font-bold text-white">{totalGroups}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-[#1A2744] rounded-xl p-6"
          style={{ background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${totalDuplicates > 0 ? 'bg-[#EF4444]/20' : 'bg-[#22C55E]/20'}`}>
              <AlertTriangle className={`h-6 w-6 ${totalDuplicates > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`} />
            </div>
            <div>
              <p className="text-[#94A3B8] text-sm">Total Duplicate Records</p>
              <p className="text-2xl font-bold text-white">{totalDuplicates}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Banner */}
      {totalGroups > 0 && (
        <div className="flex items-start gap-3 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
          <Info className="h-5 w-5 text-[#F59E0B] mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[#F59E0B]">
            <p className="font-medium">Duplicates detected!</p>
            <p className="mt-1 text-[#F59E0B]/80">
              Click on a group to expand and see details. Use the "Merge" button to combine duplicates 
              into a single record (all related data will be transferred to the kept investor).
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Search by investor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569] focus:border-[#0047AB]"
          data-testid="search-duplicates"
        />
      </div>

      {/* Duplicates List */}
      {filteredDuplicates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-[#1A2744] rounded-xl p-12 text-center"
          style={{ background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
        >
          <Check className="h-16 w-16 text-[#22C55E] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Duplicates Found</h3>
          <p className="text-[#94A3B8]">All investor records are unique. Great job maintaining data quality!</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredDuplicates.map((group, idx) => (
            <motion.div
              key={group.investor_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border border-[#1A2744] rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)' }}
            >
              {/* Group Header */}
              <button
                onClick={() => toggleExpand(group.investor_name)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#0047AB]/10 transition-colors"
                data-testid={`expand-group-${idx}`}
              >
                <div className="flex items-center gap-3">
                  {expandedGroups[group.investor_name] ? (
                    <ChevronDown className="h-5 w-5 text-[#94A3B8]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-[#94A3B8]" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-white">{group.investor_name}</p>
                    <p className="text-sm text-[#94A3B8]">
                      {group.count} duplicate records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#EF4444]/20 text-[#EF4444] border-0">
                    {group.count} duplicates
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMergeDialog(group);
                    }}
                    className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
                    data-testid={`quick-merge-group-${idx}`}
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    Quick Merge
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMergeCompare(group);
                    }}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                    data-testid={`compare-merge-group-${idx}`}
                  >
                    <GitMerge className="h-4 w-4 mr-1" />
                    Compare & Merge
                  </Button>
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedGroups[group.investor_name] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-[#1A2744] overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#1A2744] hover:bg-transparent">
                            <TableHead className="text-[#94A3B8]">Fund</TableHead>
                            <TableHead className="text-[#94A3B8]">Type</TableHead>
                            <TableHead className="text-[#94A3B8]">Email</TableHead>
                            <TableHead className="text-[#94A3B8]">Phone</TableHead>
                            <TableHead className="text-[#94A3B8]">Source</TableHead>
                            <TableHead className="text-[#94A3B8]">Created</TableHead>
                            <TableHead className="text-[#94A3B8] w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.investors.map((inv, invIdx) => (
                            <TableRow 
                              key={inv.id} 
                              className="border-[#1A2744] hover:bg-[#0047AB]/10"
                            >
                              <TableCell className="text-white font-medium">
                                {inv.fund_name}
                              </TableCell>
                              <TableCell className="text-[#94A3B8]">
                                {inv.investor_type || '-'}
                              </TableCell>
                              <TableCell className="text-[#94A3B8]">
                                {inv.contact_email || '-'}
                              </TableCell>
                              <TableCell className="text-[#94A3B8]">
                                {inv.contact_phone || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge className={`border-0 ${
                                  inv.source === 'manual' ? 'bg-[#0047AB]/20 text-[#00A3FF]' :
                                  inv.source === 'spreadsheet_import' ? 'bg-[#22C55E]/20 text-[#22C55E]' :
                                  'bg-[#A78BFA]/20 text-[#A78BFA]'
                                }`}>
                                  {inv.source === 'manual' ? 'Manual' :
                                   inv.source === 'spreadsheet_import' ? 'Import' :
                                   inv.source === 'chrome_extension' ? 'Extension' : inv.source}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[#94A3B8]">
                                {formatDate(inv.created_at)}
                                {invIdx === 0 && (
                                  <span className="ml-2 text-xs text-[#22C55E]">(Oldest)</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(inv.id, inv.investor_name)}
                                  className="h-8 w-8 p-0 text-[#EF4444] hover:text-white hover:bg-[#EF4444]/20"
                                  data-testid={`delete-investor-${inv.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Merge className="h-5 w-5 text-[#00A3FF]" />
              Merge Duplicate Investors
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Select which investor record to keep. All related data (evidence, notes, call logs, tasks) 
              will be transferred to the kept record. Other duplicates will be deleted.
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup && (
            <div className="py-4 space-y-4">
              <p className="text-sm text-[#94A3B8]">
                Merging <span className="font-semibold text-white">{selectedGroup.count}</span> records 
                for "<span className="font-semibold text-white">{selectedGroup.investor_name}</span>"
              </p>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Select which record to keep:</p>
                {selectedGroup.investors.map((inv, idx) => (
                  <label
                    key={inv.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedKeep === inv.id 
                        ? 'border-[#0047AB] bg-[#0047AB]/20' 
                        : 'border-[#1A2744] hover:border-[#0047AB]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="keepInvestor"
                      value={inv.id}
                      checked={selectedKeep === inv.id}
                      onChange={() => setSelectedKeep(inv.id)}
                      className="accent-[#0047AB]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{inv.fund_name}</span>
                        {idx === 0 && (
                          <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-0 text-xs">
                            Oldest
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-1">
                        {inv.contact_email || 'No email'} • {inv.source} • {formatDate(inv.created_at)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMergeDialog(false)}
              className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={isMerging || !selectedKeep}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="confirm-merge"
            >
              {isMerging ? 'Merging...' : 'Merge Records'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge & Compare Modal */}
      <MergeCompareModal
        open={showMergeCompare}
        onClose={() => {
          setShowMergeCompare(false);
          setSelectedGroup(null);
        }}
        duplicateGroup={selectedGroup}
        token={token}
        API_URL={API_URL}
        onSuccess={fetchDuplicates}
      />
    </div>
  );
};

export default DuplicateInvestorsPage;
