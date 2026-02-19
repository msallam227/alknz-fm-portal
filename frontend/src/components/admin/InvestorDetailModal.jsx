import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, 
  Phone, 
  Mail, 
  Globe,
  MapPin,
  Building,
  Briefcase,
  Target,
  Route,
  Calendar,
  Clock,
  FileText,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

// Helper to get initials
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper to format currency
const formatCurrency = (amount, currency = 'USD') => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount);
};

// Relationship strength colors
const RELATIONSHIP_COLORS = {
  cold: { bg: 'bg-[#94A3B8]/10', text: 'text-[#94A3B8]', label: 'Cold' },
  warm: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Warm' },
  direct: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', label: 'Direct' },
  unknown: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', label: 'Unknown' }
};

// Decision role colors
const DECISION_ROLE_COLORS = {
  decision_maker: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', label: 'Decision Maker' },
  influencer: { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', label: 'Influencer' },
  gatekeeper: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Gatekeeper' },
  unknown: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', label: 'Unknown' }
};

const InvestorDetailModal = ({
  open,
  onClose,
  investorId,
  token,
  API_URL
}) => {
  const [investor, setInvestor] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && investorId) {
      fetchInvestorDetails();
    }
  }, [open, investorId]);

  const fetchInvestorDetails = async () => {
    setLoading(true);
    try {
      const [investorRes, assignmentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/investor-profiles/${investorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/investors/${investorId}/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setInvestor(investorRes.data);
      setAssignments(assignmentsRes.data.assignments || []);
      
      // Fetch evidence count
      try {
        const evidenceRes = await axios.get(
          `${API_URL}/api/investors/${investorId}/evidence`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEvidenceCount(evidenceRes.data?.length || 0);
      } catch {
        setEvidenceCount(0);
      }
      
    } catch (error) {
      console.error('Failed to fetch investor details:', error);
      toast.error('Failed to load investor details');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInvestor(null);
    setAssignments([]);
    onClose();
  };

  const relStrength = RELATIONSHIP_COLORS[investor?.relationship_strength] || RELATIONSHIP_COLORS.unknown;
  const decRole = DECISION_ROLE_COLORS[investor?.decision_role] || DECISION_ROLE_COLORS.unknown;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-[600px] sm:max-w-[600px] bg-[#0A1628] border-l border-[#1A2744] text-white overflow-y-auto"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#0047AB]" />
          </div>
        ) : investor ? (
          <div className="space-y-6">
            {/* Header */}
            <SheetHeader className="pb-4 border-b border-[#1A2744]">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-[#0047AB] text-white text-xl">
                    {getInitials(investor.investor_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <SheetTitle className="text-2xl font-bold text-white">
                    {investor.investor_name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-[#1A2744] text-[#94A3B8] border-0">
                      {investor.investor_type || 'Individual'}
                    </Badge>
                    {investor.country && (
                      <span className="text-[#94A3B8] text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {investor.city ? `${investor.city}, ` : ''}{investor.country}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Fund Assignments */}
            <div className="space-y-3">
              <Label className="text-[#94A3B8] text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Fund Assignments ({assignments.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {assignments.map(a => (
                  <Badge 
                    key={a.id || a.fund_id}
                    className={`py-1.5 px-3 border-0 ${
                      a.is_legacy 
                        ? 'bg-[#F59E0B]/20 text-[#F59E0B]' 
                        : 'bg-[#22C55E]/20 text-[#22C55E]'
                    }`}
                  >
                    {a.fund_name}
                    {a.is_legacy && <span className="ml-1 text-xs opacity-70">(Original)</span>}
                  </Badge>
                ))}
                {assignments.length === 0 && (
                  <span className="text-[#94A3B8] text-sm">Not assigned to any fund</span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-[#1A2744] bg-[#02040A]/40">
                <div className="flex items-center gap-2 text-[#94A3B8] text-xs mb-1">
                  <FileText className="h-3 w-3" />
                  Evidence
                </div>
                <p className="text-xl font-bold text-white">{evidenceCount}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#1A2744] bg-[#02040A]/40">
                <div className="flex items-center gap-2 text-[#94A3B8] text-xs mb-1">
                  <Target className="h-3 w-3" />
                  Relationship
                </div>
                <Badge className={`${relStrength.bg} ${relStrength.text} border-0`}>
                  {relStrength.label}
                </Badge>
              </div>
              <div className="p-3 rounded-lg border border-[#1A2744] bg-[#02040A]/40">
                <div className="flex items-center gap-2 text-[#94A3B8] text-xs mb-1">
                  <User className="h-3 w-3" />
                  Decision Role
                </div>
                <Badge className={`${decRole.bg} ${decRole.text} border-0`}>
                  {decRole.label}
                </Badge>
              </div>
            </div>

            {/* Identity Section */}
            <div className="space-y-3 p-4 rounded-lg border border-[#1A2744] bg-[#02040A]/40">
              <Label className="text-[#00A3FF] font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Identity Information
              </Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#94A3B8]">Title:</span>
                  <span className="ml-2 text-white">{investor.title || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Gender:</span>
                  <span className="ml-2 text-white">{investor.gender || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Nationality:</span>
                  <span className="ml-2 text-white">{investor.nationality || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Age:</span>
                  <span className="ml-2 text-white">{investor.age || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Job Title:</span>
                  <span className="ml-2 text-white">{investor.job_title || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Sector:</span>
                  <span className="ml-2 text-white">{investor.sector || '-'}</span>
                </div>
                {investor.website && (
                  <div className="col-span-2">
                    <span className="text-[#94A3B8]">Website:</span>
                    <a 
                      href={investor.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-[#00A3FF] hover:underline inline-flex items-center gap-1"
                    >
                      {investor.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {investor.description && (
                  <div className="col-span-2">
                    <span className="text-[#94A3B8]">Description:</span>
                    <p className="mt-1 text-white text-sm">{investor.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-3 p-4 rounded-lg border border-[#1A2744] bg-[#02040A]/40">
              <Label className="text-[#00A3FF] font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#94A3B8]">Contact Name:</span>
                  <span className="ml-2 text-white">{investor.contact_name || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Contact Title:</span>
                  <span className="ml-2 text-white">{investor.contact_title || '-'}</span>
                </div>
                {investor.contact_phone && (
                  <div>
                    <span className="text-[#94A3B8]">Phone:</span>
                    <a href={`tel:${investor.contact_phone}`} className="ml-2 text-[#00A3FF] hover:underline">
                      {investor.contact_phone}
                    </a>
                  </div>
                )}
                {investor.contact_email && (
                  <div>
                    <span className="text-[#94A3B8]">Email:</span>
                    <a href={`mailto:${investor.contact_email}`} className="ml-2 text-[#00A3FF] hover:underline">
                      {investor.contact_email}
                    </a>
                  </div>
                )}
                {investor.contact_whatsapp && (
                  <div>
                    <span className="text-[#94A3B8]">WhatsApp:</span>
                    <a 
                      href={`https://wa.me/${investor.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="ml-2 text-[#25D366] hover:underline"
                    >
                      {investor.contact_whatsapp}
                    </a>
                  </div>
                )}
                {investor.preferred_intro_path && (
                  <div className="col-span-2">
                    <span className="text-[#94A3B8] flex items-center gap-1">
                      <Route className="h-3 w-3" />
                      Preferred Intro Path:
                    </span>
                    <p className="mt-1 text-white">{investor.preferred_intro_path}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Investment Context Section */}
            <div className="space-y-3 p-4 rounded-lg border border-[#1A2744] bg-[#02040A]/40">
              <Label className="text-[#00A3FF] font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Investment Context
              </Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#94A3B8]">Wealth:</span>
                  <span className="ml-2 text-white">{investor.wealth || '-'}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Has Invested Before:</span>
                  <span className={`ml-2 ${
                    investor.has_invested_with_alknz === true ? 'text-[#22C55E]' :
                    investor.has_invested_with_alknz === false ? 'text-[#EF4444]' :
                    'text-white'
                  }`}>
                    {investor.has_invested_with_alknz === true ? 'Yes' :
                     investor.has_invested_with_alknz === false ? 'No' : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Expected Ticket:</span>
                  <span className="ml-2 text-white">
                    {formatCurrency(investor.expected_ticket_amount, investor.expected_ticket_currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Investment Size:</span>
                  <span className="ml-2 text-white">
                    {formatCurrency(investor.investment_size, investor.investment_size_currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-4 border-t border-[#1A2744]">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created: {formatDate(investor.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated: {formatDate(investor.updated_at)}
              </div>
              <Badge className={`border-0 ${
                investor.source === 'manual' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                investor.source === 'spreadsheet_import' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                'bg-[#8B5CF6]/10 text-[#8B5CF6]'
              }`}>
                {investor.source === 'manual' ? 'Manual' :
                 investor.source === 'spreadsheet_import' ? 'Import' :
                 investor.source === 'chrome_extension' ? 'Extension' : investor.source}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#94A3B8]">Investor not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default InvestorDetailModal;
