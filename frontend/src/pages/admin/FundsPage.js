import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SECTORS = ["Technology", "Healthcare", "Fintech", "Consumer", "Enterprise", "AI/ML", "Crypto/Web3", "Climate", "Real Estate", "Infrastructure"];
const REGIONS = ["North America", "Europe", "MENA", "Asia Pacific", "Latin America", "Africa", "Global"];
const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Growth", "Late Stage"];

const emptyFund = {
  name: '',
  fund_type: 'Fund',
  vintage_year: new Date().getFullYear(),
  currency: 'USD',
  target_raise: '',
  target_date: '',
  status: 'Draft',
  thesis: '',
  primary_sectors: [],
  focus_regions: [],
  stage_focus: [],
  min_commitment: '',
  typical_check_min: '',
  typical_check_max: '',
  esg_policy: 'None'
};

const FundsPage = () => {
  const { token, API_URL } = useAuth();
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fundData, setFundData] = useState(emptyFund);

  const fetchFunds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/funds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFunds(response.data);
    } catch (error) {
      console.error('Failed to fetch funds:', error);
      toast.error('Failed to load funds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, [token, API_URL]);

  const openCreateDialog = () => {
    setFundData(emptyFund);
    setIsEditing(false);
    setShowFundDialog(true);
  };

  const openEditDialog = (fund) => {
    setFundData({
      ...fund,
      target_raise: fund.target_raise || '',
      target_date: fund.target_date || '',
      min_commitment: fund.min_commitment || '',
      typical_check_min: fund.typical_check_min || '',
      typical_check_max: fund.typical_check_max || ''
    });
    setIsEditing(true);
    setShowFundDialog(true);
  };

  const handleSaveFund = async () => {
    if (!fundData.name) {
      toast.error('Fund name is required');
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      ...fundData,
      target_raise: fundData.target_raise ? parseFloat(fundData.target_raise) : null,
      target_date: fundData.target_date || null,
      min_commitment: fundData.min_commitment ? parseFloat(fundData.min_commitment) : null,
      typical_check_min: fundData.typical_check_min ? parseFloat(fundData.typical_check_min) : null,
      typical_check_max: fundData.typical_check_max ? parseFloat(fundData.typical_check_max) : null,
      vintage_year: fundData.vintage_year ? parseInt(fundData.vintage_year) : null
    };

    try {
      if (isEditing && fundData.id) {
        await axios.put(`${API_URL}/api/funds/${fundData.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fund updated successfully');
      } else {
        await axios.post(`${API_URL}/api/funds`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fund created successfully');
      }
      setShowFundDialog(false);
      await fetchFunds();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update fund' : 'Failed to create fund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFund = async () => {
    if (!selectedFund) return;

    try {
      await axios.delete(`${API_URL}/api/funds/${selectedFund.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Fund deleted successfully');
      setShowDeleteDialog(false);
      setSelectedFund(null);
      await fetchFunds();
    } catch (error) {
      toast.error('Failed to delete fund');
    }
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  const filteredFunds = funds.filter(fund => {
    const search = searchQuery.toLowerCase();
    return (
      fund.name?.toLowerCase().includes(search) ||
      fund.fund_type?.toLowerCase().includes(search) ||
      fund.status?.toLowerCase().includes(search)
    );
  });

  const formatCurrency = (value, currency = 'USD') => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-[#22C55E]/15 text-[#22C55E]';
      case 'Closed': return 'bg-[#94A3B8]/15 text-[#94A3B8]';
      default: return 'bg-[#0047AB]/20 text-[#00A3FF]';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="funds-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Funds</h1>
          <p className="text-[#94A3B8] mt-1">Manage investment funds and SPVs</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="text-white"
          style={{
            background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)',
            boxShadow: '0 0 20px rgba(0, 71, 171, 0.4)'
          }}
          data-testid="create-fund-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Fund
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Search funds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569] focus:border-[#0047AB]"
          data-testid="search-funds-input"
        />
      </div>

      {/* Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFunds.map((fund, index) => (
          <motion.div
            key={fund.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border border-[#1A2744] rounded-xl p-6 hover:border-[#0047AB]/50 transition-colors"
            style={{
              background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
            }}
            data-testid={`fund-card-${fund.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0047AB]/20">
                  <Briefcase className="h-5 w-5 text-[#00A3FF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{fund.name}</h3>
                  <p className="text-xs text-[#94A3B8]">{fund.fund_type}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 text-[#94A3B8] hover:text-white hover:bg-[#0047AB]/20"
                    data-testid={`fund-actions-${fund.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  className="bg-[#0A1628] border-[#1A2744]"
                >
                  <DropdownMenuItem 
                    onClick={() => openEditDialog(fund)}
                    className="text-white focus:bg-[#0047AB]/20 focus:text-white cursor-pointer"
                    data-testid={`edit-fund-${fund.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedFund(fund);
                      setShowDeleteDialog(true);
                    }}
                    className="text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444] cursor-pointer"
                    data-testid={`delete-fund-${fund.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fund.status)}`}>
                  {fund.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Target Raise</span>
                <span className="text-sm text-white font-medium">
                  {formatCurrency(fund.target_raise, fund.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Vintage</span>
                <span className="text-sm text-white">
                  {fund.vintage_year || '-'}
                </span>
              </div>

              {fund.primary_sectors?.length > 0 && (
                <div className="pt-2 border-t border-[#1A2744]">
                  <div className="flex flex-wrap gap-1">
                    {fund.primary_sectors.slice(0, 3).map(sector => (
                      <span 
                        key={sector}
                        className="px-2 py-0.5 text-xs bg-[#02040A] text-[#94A3B8] rounded"
                      >
                        {sector}
                      </span>
                    ))}
                    {fund.primary_sectors.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-[#94A3B8]">
                        +{fund.primary_sectors.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {filteredFunds.length === 0 && (
          <div className="col-span-full text-center py-12 text-[#94A3B8]">
            No funds found. Create your first fund to get started.
          </div>
        )}
      </div>

      {/* Fund Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold">
              {isEditing ? 'Edit Fund' : 'Create New Fund'}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {isEditing ? 'Update fund details' : 'Fill in the fund information'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-white">Fund Name *</Label>
                <Input
                  value={fundData.name}
                  onChange={(e) => setFundData({ ...fundData, name: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                  data-testid="fund-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Fund Type</Label>
                <Select
                  value={fundData.fund_type}
                  onValueChange={(value) => setFundData({ ...fundData, fund_type: value })}
                >
                  <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                    <SelectItem value="Fund" className="text-white focus:bg-[#0047AB]/20">Fund</SelectItem>
                    <SelectItem value="SPV" className="text-white focus:bg-[#0047AB]/20">SPV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Status</Label>
                <Select
                  value={fundData.status}
                  onValueChange={(value) => setFundData({ ...fundData, status: value })}
                >
                  <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                    <SelectItem value="Draft" className="text-white focus:bg-[#0047AB]/20">Draft</SelectItem>
                    <SelectItem value="Active" className="text-white focus:bg-[#0047AB]/20">Active</SelectItem>
                    <SelectItem value="Closed" className="text-white focus:bg-[#0047AB]/20">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Vintage Year</Label>
                <Input
                  type="number"
                  value={fundData.vintage_year}
                  onChange={(e) => setFundData({ ...fundData, vintage_year: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Currency</Label>
                <Select
                  value={fundData.currency}
                  onValueChange={(value) => setFundData({ ...fundData, currency: value })}
                >
                  <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                    <SelectItem value="USD" className="text-white focus:bg-[#0047AB]/20">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white focus:bg-[#0047AB]/20">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white focus:bg-[#0047AB]/20">GBP</SelectItem>
                    <SelectItem value="AED" className="text-white focus:bg-[#0047AB]/20">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Target Raise</Label>
                <Input
                  type="number"
                  value={fundData.target_raise}
                  onChange={(e) => setFundData({ ...fundData, target_raise: e.target.value })}
                  placeholder="e.g., 50000000"
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Target Date</Label>
                <Input
                  type="date"
                  value={fundData.target_date ? fundData.target_date.split('T')[0] : ''}
                  onChange={(e) => setFundData({ ...fundData, target_date: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                  data-testid="fund-target-date"
                />
                <p className="text-xs text-[#475569]">When do you want to reach the fundraising target?</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Min Commitment</Label>
                <Input
                  type="number"
                  value={fundData.min_commitment}
                  onChange={(e) => setFundData({ ...fundData, min_commitment: e.target.value })}
                  placeholder="e.g., 250000"
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                />
              </div>
            </div>

            {/* Thesis */}
            <div className="space-y-2">
              <Label className="text-white">Investment Thesis</Label>
              <Textarea
                value={fundData.thesis}
                onChange={(e) => setFundData({ ...fundData, thesis: e.target.value })}
                placeholder="Describe the fund's investment strategy..."
                className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB] min-h-[100px]"
              />
            </div>

            {/* Sectors */}
            <div className="space-y-2">
              <Label className="text-white">Primary Sectors</Label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(sector => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => setFundData({
                      ...fundData,
                      primary_sectors: toggleArrayItem(fundData.primary_sectors || [], sector)
                    })}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      fundData.primary_sectors?.includes(sector)
                        ? 'bg-[#0047AB]/20 border-[#0047AB] text-[#00A3FF]'
                        : 'bg-[#02040A]/60 border-[#1A2744] text-[#94A3B8] hover:border-[#0047AB]/50'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div className="space-y-2">
              <Label className="text-white">Focus Regions</Label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(region => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setFundData({
                      ...fundData,
                      focus_regions: toggleArrayItem(fundData.focus_regions || [], region)
                    })}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      fundData.focus_regions?.includes(region)
                        ? 'bg-[#0047AB]/20 border-[#0047AB] text-[#00A3FF]'
                        : 'bg-[#02040A]/60 border-[#1A2744] text-[#94A3B8] hover:border-[#0047AB]/50'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>

            {/* Stages */}
            <div className="space-y-2">
              <Label className="text-white">Stage Focus</Label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map(stage => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setFundData({
                      ...fundData,
                      stage_focus: toggleArrayItem(fundData.stage_focus || [], stage)
                    })}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      fundData.stage_focus?.includes(stage)
                        ? 'bg-[#0047AB]/20 border-[#0047AB] text-[#00A3FF]'
                        : 'bg-[#02040A]/60 border-[#1A2744] text-[#94A3B8] hover:border-[#0047AB]/50'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            {/* Check Sizes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Typical Check Min</Label>
                <Input
                  type="number"
                  value={fundData.typical_check_min}
                  onChange={(e) => setFundData({ ...fundData, typical_check_min: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Typical Check Max</Label>
                <Input
                  type="number"
                  value={fundData.typical_check_max}
                  onChange={(e) => setFundData({ ...fundData, typical_check_max: e.target.value })}
                  className="bg-[#02040A]/60 border-[#1A2744] text-white focus:border-[#0047AB]"
                />
              </div>
            </div>

            {/* ESG */}
            <div className="space-y-2">
              <Label className="text-white">ESG Policy</Label>
              <Select
                value={fundData.esg_policy}
                onValueChange={(value) => setFundData({ ...fundData, esg_policy: value })}
              >
                <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                  <SelectItem value="None" className="text-white focus:bg-[#0047AB]/20">None</SelectItem>
                  <SelectItem value="Prefer" className="text-white focus:bg-[#0047AB]/20">Prefer</SelectItem>
                  <SelectItem value="Require" className="text-white focus:bg-[#0047AB]/20">Require</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFundDialog(false)}
              className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFund}
              disabled={isSubmitting}
              className="text-white"
              style={{
                background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)'
              }}
              data-testid="submit-fund-button"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Fund' : 'Create Fund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#0A1628] border-[#1A2744]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Fund</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure you want to delete "{selectedFund?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFund}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
              data-testid="confirm-delete-fund"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FundsPage;
