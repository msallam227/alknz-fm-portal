import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Building,
  X,
  ArrowUpDown,
  Briefcase,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import axios from 'axios';
import { toast } from 'sonner';
import AssignToFundModal from '@/components/admin/AssignToFundModal';
import InvestorDetailModal from '@/components/admin/InvestorDetailModal';

// Source badge colors
const SOURCE_COLORS = {
  manual: { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]' },
  spreadsheet_import: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]' },
  chrome_extension: { bg: 'bg-[#8B5CF6]/10', text: 'text-[#8B5CF6]' }
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const AllInvestorsPage = () => {
  const { token, API_URL } = useAuth();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    sources: [],
    countries: [],
    investor_types: [],
    funds: []
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [fundFilter, setFundFilter] = useState('all');
  
  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Stats
  const [total, setTotal] = useState(0);
  
  // Assign to Fund Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  
  // View Details Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);

  const fetchInvestors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (typeFilter !== 'all') params.append('investor_type', typeFilter);
      if (countryFilter !== 'all') params.append('country', countryFilter);
      if (assignedFilter !== 'all') params.append('assigned', assignedFilter);
      if (fundFilter !== 'all') params.append('fund_id', fundFilter);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      
      const response = await axios.get(
        `${API_URL}/api/admin/all-investors?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setInvestors(response.data.investors || []);
      setTotal(response.data.total || 0);
      setFilterOptions(response.data.filter_options || {});
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      toast.error('Failed to load investors');
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, search, sourceFilter, typeFilter, countryFilter, assignedFilter, fundFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchInvestors();
  }, [fetchInvestors]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvestors();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('all');
    setTypeFilter('all');
    setCountryFilter('all');
    setAssignedFilter('all');
    setFundFilter('all');
  };

  const hasActiveFilters = search || sourceFilter !== 'all' || typeFilter !== 'all' || 
    countryFilter !== 'all' || assignedFilter !== 'all' || fundFilter !== 'all';

  const handleAssignToFund = (investor) => {
    setSelectedInvestor(investor);
    setShowAssignModal(true);
  };

  const handleViewDetails = (investorId) => {
    setSelectedInvestorId(investorId);
    setShowDetailModal(true);
  };

  const handleAssignSuccess = () => {
    fetchInvestors(); // Refresh the list
  };

  const SortableHeader = ({ column, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-[#1A2744]/50 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-[#0047AB]" />
            All Investors
          </h1>
          <p className="text-[#94A3B8] mt-1">
            {total} investor{total !== 1 ? 's' : ''} in the system
          </p>
        </div>
      </div>

      {/* Filters */}
      <div 
        className="rounded-xl border border-[#1A2744] p-4"
        style={{ background: 'rgba(2, 4, 10, 0.4)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, location..."
              className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="all-investors-search"
            />
          </div>

          {/* Source Filter */}
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px] bg-[#02040A]/60 border-[#1A2744] text-white">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744]">
              <SelectItem value="all" className="text-white focus:bg-[#0047AB]/20">
                All Sources
              </SelectItem>
              {filterOptions.sources?.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-white focus:bg-[#0047AB]/20">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Investor Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-[#02040A]/60 border-[#1A2744] text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744]">
              <SelectItem value="all" className="text-white focus:bg-[#0047AB]/20">
                All Types
              </SelectItem>
              {filterOptions.investor_types?.map(t => (
                <SelectItem key={t} value={t} className="text-white focus:bg-[#0047AB]/20">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Country Filter */}
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[160px] bg-[#02040A]/60 border-[#1A2744] text-white">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-[300px]">
              <SelectItem value="all" className="text-white focus:bg-[#0047AB]/20">
                All Countries
              </SelectItem>
              {filterOptions.countries?.map(c => (
                <SelectItem key={c} value={c} className="text-white focus:bg-[#0047AB]/20">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assigned Filter */}
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[160px] bg-[#02040A]/60 border-[#1A2744] text-white">
              <SelectValue placeholder="Assignment" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744]">
              <SelectItem value="all" className="text-white focus:bg-[#0047AB]/20">
                All Investors
              </SelectItem>
              <SelectItem value="assigned" className="text-white focus:bg-[#0047AB]/20">
                Assigned to Fund
              </SelectItem>
              <SelectItem value="unassigned" className="text-white focus:bg-[#0047AB]/20">
                Unassigned
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Fund Filter */}
          <Select value={fundFilter} onValueChange={setFundFilter}>
            <SelectTrigger className="w-[180px] bg-[#02040A]/60 border-[#1A2744] text-white">
              <SelectValue placeholder="Fund" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-[300px]">
              <SelectItem value="all" className="text-white focus:bg-[#0047AB]/20">
                All Funds
              </SelectItem>
              {filterOptions.funds?.map(f => (
                <SelectItem key={f.id} value={f.id} className="text-white focus:bg-[#0047AB]/20">
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-[#94A3B8] hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div 
        className="rounded-xl border border-[#1A2744] overflow-hidden"
        style={{ background: 'rgba(2, 4, 10, 0.4)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0047AB]"></div>
          </div>
        ) : investors.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-[#475569] mx-auto mb-3" />
            <h3 className="text-white font-medium mb-1">No investors found</h3>
            <p className="text-[#94A3B8] text-sm">
              {hasActiveFilters ? 'Try adjusting your filters' : 'No investors in the system yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#1A2744] hover:bg-transparent">
                  <SortableHeader column="investor_name">
                    <span className="text-[#94A3B8] font-medium">Investor</span>
                  </SortableHeader>
                  <TableHead className="text-[#94A3B8] font-medium">Firm / Title</TableHead>
                  <TableHead className="text-[#94A3B8] font-medium">Type</TableHead>
                  <TableHead className="text-[#94A3B8] font-medium">Location</TableHead>
                  <TableHead className="text-[#94A3B8] font-medium">Contact</TableHead>
                  <TableHead className="text-[#94A3B8] font-medium">Source</TableHead>
                  <SortableHeader column="created_at">
                    <span className="text-[#94A3B8] font-medium">Created</span>
                  </SortableHeader>
                  <SortableHeader column="evidence_count">
                    <span className="text-[#94A3B8] font-medium">Evidence</span>
                  </SortableHeader>
                  <TableHead className="text-[#94A3B8] font-medium">Funds</TableHead>
                  <SortableHeader column="latest_evidence">
                    <span className="text-[#94A3B8] font-medium">Latest Evidence</span>
                  </SortableHeader>
                  <TableHead className="text-[#94A3B8] font-medium w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((investor) => {
                  const sourceColor = SOURCE_COLORS[investor.source] || SOURCE_COLORS.manual;
                  
                  return (
                    <TableRow 
                      key={investor.id}
                      className="border-b border-[#1A2744] hover:bg-[#1A2744]/30"
                      data-testid={`investor-row-${investor.id}`}
                    >
                      {/* Investor Name */}
                      <TableCell className="font-medium text-white">
                        {investor.investor_name || '-'}
                      </TableCell>

                      {/* Firm / Job Title */}
                      <TableCell className="text-[#94A3B8]">
                        {investor.job_title || '-'}
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge variant="outline" className="text-[#94A3B8] border-[#1A2744]">
                          {investor.investor_type || 'Individual'}
                        </Badge>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        {(investor.city || investor.country) ? (
                          <div className="flex items-center gap-1 text-[#94A3B8]">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">
                              {investor.city && investor.country 
                                ? `${investor.city}, ${investor.country}`
                                : investor.city || investor.country}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#475569]">-</span>
                        )}
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-0.5">
                          {investor.contact_email && (
                            <div className="flex items-center gap-1 text-[#94A3B8] text-sm">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{investor.contact_email}</span>
                            </div>
                          )}
                          {investor.contact_phone && (
                            <div className="flex items-center gap-1 text-[#94A3B8] text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{investor.contact_phone}</span>
                            </div>
                          )}
                          {!investor.contact_email && !investor.contact_phone && (
                            <span className="text-[#475569]">-</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Source */}
                      <TableCell>
                        <Badge className={`${sourceColor.bg} ${sourceColor.text} border-0`}>
                          {investor.source_label}
                        </Badge>
                      </TableCell>

                      {/* Created Date */}
                      <TableCell className="text-[#94A3B8] text-sm">
                        {formatDate(investor.created_at)}
                      </TableCell>

                      {/* Evidence Count */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-[#0047AB]" />
                          <span className={`font-medium ${
                            investor.evidence_count > 0 ? 'text-[#0047AB]' : 'text-[#475569]'
                          }`}>
                            {investor.evidence_count}
                          </span>
                        </div>
                      </TableCell>

                      {/* Assigned Funds */}
                      <TableCell>
                        {investor.assigned_funds_count > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <Building className="h-4 w-4 text-[#22C55E]" />
                                  <span className="text-[#22C55E] font-medium">
                                    {investor.assigned_funds_count}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#0A1628] border-[#1A2744] text-white">
                                <div className="space-y-1">
                                  {investor.assigned_fund_names.map((name, idx) => (
                                    <p key={idx} className="text-sm">{name}</p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-[#475569]">-</span>
                        )}
                      </TableCell>

                      {/* Latest Evidence Date */}
                      <TableCell>
                        {investor.latest_evidence_date ? (
                          <div className="flex items-center gap-1 text-[#94A3B8] text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDate(investor.latest_evidence_date)}
                          </div>
                        ) : (
                          <span className="text-[#475569]">-</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#94A3B8] hover:text-white hover:bg-[#1A2744]"
                              data-testid={`investor-actions-${investor.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="bg-[#0A1628] border-[#1A2744]"
                          >
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(investor.id)}
                              className="text-white focus:bg-[#0047AB]/20 cursor-pointer"
                              data-testid={`view-details-${investor.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2 text-[#94A3B8]" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#1A2744]" />
                            <DropdownMenuItem
                              onClick={() => handleAssignToFund(investor)}
                              className="text-white focus:bg-[#0047AB]/20 cursor-pointer"
                              data-testid={`assign-to-fund-${investor.id}`}
                            >
                              <Briefcase className="h-4 w-4 mr-2 text-[#00A3FF]" />
                              Assign to Fund
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Assign to Fund Modal */}
      <AssignToFundModal
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedInvestor(null);
        }}
        investor={selectedInvestor}
        token={token}
        API_URL={API_URL}
        onSuccess={handleAssignSuccess}
      />

      {/* Investor Detail Modal */}
      <InvestorDetailModal
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvestorId(null);
        }}
        investorId={selectedInvestorId}
        token={token}
        API_URL={API_URL}
      />
    </div>
  );
};

export default AllInvestorsPage;
