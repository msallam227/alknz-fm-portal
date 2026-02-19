import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Briefcase,
  Building,
  Edit3,
  Trash2,
  Save,
  X,
  Settings,
  Calendar,
  Clock,
  GitBranch,
  DollarSign,
  Phone,
  UserCircle2,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { usePersonaData } from '../../hooks/usePersonaData';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  getInitials,
  getStageTextColor
} from './constants';
import {
  InvestmentIdentityFields,
  InvestmentContextFields,
  ContactRelationshipFields
} from './InvestorFormFields';
import { EvidenceBlock } from './EvidenceBlock';

// ─── Persona Match Panel ─────────────────────────────────────────────────────
function PersonaMatchPanel({ investor, selectedFund, token, API_URL }) {
  const fundId = selectedFund?.id;
  const { personas, matchInvestor } = usePersonaData(fundId, token, API_URL);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');

  const handleRun = async () => {
    if (!investor?.id) return;
    setLoading(true);
    try {
      const result = await matchInvestor(investor.id);
      setMatches(result.matches || []);
      setMethod(result.method || '');
    } catch (err) {
      toast.error('Failed to run persona analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!fundId) return <p className="text-[#94A3B8] text-sm">Select a fund to view persona matches.</p>;

  if (personas.length === 0) {
    return (
      <div className="text-center py-10">
        <UserCircle2 className="w-10 h-10 text-[#1A2744] mx-auto mb-3" />
        <p className="text-[#94A3B8] text-sm">No personas defined for this fund yet.</p>
        <p className="text-[#94A3B8] text-xs mt-1">Go to the Personas tab to create investor archetypes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-base flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-[#00A3FF]" />
            Persona Match Analysis
          </h3>
          <p className="text-[#94A3B8] text-xs mt-0.5">
            Score this investor against the fund's {personas.length} defined persona{personas.length !== 1 ? 's' : ''}.
            {method === 'ai' && <span className="text-[#00A3FF] ml-1">· AI scored</span>}
            {method === 'rule_based' && <span className="text-[#94A3B8] ml-1">· Rule-based</span>}
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0047AB] hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Analyzing...' : matches.length ? 'Re-analyze' : 'Run Analysis'}
        </button>
      </div>

      {matches.length === 0 && !loading && (
        <div className="text-center py-8 text-[#94A3B8] text-sm">
          Click "Run Analysis" to score this investor against the fund's personas.
        </div>
      )}

      {matches.map((match) => (
        <div key={match.persona_id} className="bg-[#0A1628] border border-[#1A2744] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCircle2 className="w-4 h-4 text-[#94A3B8]" />
              <span className="text-white font-medium text-sm">{match.persona_name}</span>
            </div>
            <span className={`text-lg font-bold ${
              match.score >= 80 ? 'text-green-400' : match.score >= 50 ? 'text-yellow-400' : 'text-[#94A3B8]'
            }`}>
              {match.score}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#1A2744] rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${
                match.score >= 80 ? 'bg-green-500' : match.score >= 50 ? 'bg-yellow-500' : 'bg-[#475569]'
              }`}
              style={{ width: `${match.score}%` }}
            />
          </div>

          {/* Reasoning */}
          {match.reasoning && (
            <p className="text-[#94A3B8] text-xs mb-3">{match.reasoning}</p>
          )}

          {/* Matched / Unmatched fields */}
          {(match.matched_fields?.length > 0 || match.unmatched_fields?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {match.matched_fields?.map((f, i) => (
                <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                  <CheckCircle className="w-3 h-3" /> {f}
                </span>
              ))}
              {match.unmatched_fields?.map((f, i) => (
                <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                  <XCircle className="w-3 h-3" /> {f}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Helper to format date ────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const InvestorProfile = ({
  investor,
  profileData,
  setProfileData,
  isEditing,
  setIsEditing,
  isSaving,
  onSave,
  onDelete,
  onCancel,
  historicalData,
  allFundsSPVs,
  teamMembers,
  selectedFund,
  currentUser,
  helpers = {},
  token,
  API_URL,
  onAssignToFund,
  isAdmin = false
}) => {
  const [profileTab, setProfileTab] = useState('identity');

  const { getFundName, getTeamMemberName, getOfficeName } = helpers;

  // === DERIVATION LOGIC FOR SYSTEM FIELDS ===
  const deriveAssignedFund = () => {
    if (investor?.fund_id) {
      const fund = allFundsSPVs?.find(f => f.id === investor.fund_id);
      if (fund) return { fund, status: 'matched', label: fund.name };
    }

    if (investor?.previous_alknz_funds && investor.previous_alknz_funds.length > 0) {
      const fundRef = investor.previous_alknz_funds[0];
      let fund = allFundsSPVs?.find(f => f.id === fundRef);
      if (fund) return { fund, status: 'matched', label: fund.name };

      fund = allFundsSPVs?.find(f =>
        f.name?.toLowerCase().includes(fundRef?.toLowerCase()) ||
        fundRef?.toLowerCase().includes(f.name?.toLowerCase())
      );
      if (fund) return { fund, status: 'mapped', label: `${fund.name} (mapped from "${fundRef}")` };

      return { fund: null, status: 'unmapped', label: `Unmapped: "${fundRef}"` };
    }

    if (selectedFund) return { fund: selectedFund, status: 'context', label: selectedFund.name };
    return { fund: null, status: 'none', label: 'Not Assigned' };
  };

  const deriveAssignedOffice = (resolvedFund) => {
    if (resolvedFund.status === 'matched' || resolvedFund.status === 'mapped' || resolvedFund.status === 'context') {
      const fund = resolvedFund.fund;
      if (fund?.office_id) {
        const officeName = getOfficeName ? getOfficeName(fund.office_id) : fund.office_id;
        return { officeId: fund.office_id, label: officeName, isFallback: false };
      }
    }

    if (currentUser?.office_id) {
      const officeName = getOfficeName ? getOfficeName(currentUser.office_id) : currentUser.office_id;
      return { officeId: currentUser.office_id, label: officeName, isFallback: true };
    }

    return { officeId: null, label: 'Not Assigned', isFallback: false };
  };

  const resolvedFund = investor ? deriveAssignedFund() : { fund: null, status: 'none', label: '-' };
  const resolvedOffice = investor ? deriveAssignedOffice(resolvedFund) : { officeId: null, label: '-', isFallback: false };

  if (!investor) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center h-full min-h-[400px]"
      >
        <div className="text-center">
          <User className="h-16 w-16 text-[#94A3B8] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Select an Investor</h2>
          <p className="text-[#94A3B8]">Choose an investor from the list or add a new one</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={investor.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Fixed Profile Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0 border-b border-[#1A2744]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#0047AB] text-white text-xl">
                {getInitials(investor.investor_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {investor.investor_name}
              </h1>
              <p className="text-[#94A3B8]">
                {investor.investor_type}
                {investor.country && ` • ${investor.city ? `${investor.city}, ` : ''}${investor.country}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                  data-testid="save-profile-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                {isAdmin && onAssignToFund && (
                  <Button
                    variant="outline"
                    onClick={() => onAssignToFund(investor)}
                    className="bg-transparent border-[#0047AB] text-[#00A3FF] hover:bg-[#0047AB]/20"
                    data-testid="assign-to-fund-button"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Assign to Fund
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
                  data-testid="edit-profile-button"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={onDelete}
                  className="bg-transparent border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10"
                  data-testid="delete-profile-button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Inner Tab Navigation */}
        <div className="mt-4">
          <Tabs value={profileTab} onValueChange={setProfileTab}>
            <TabsList className="bg-transparent border-0 h-9 p-0">
              <TabsTrigger
                value="identity"
                className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] text-[#94A3B8] rounded-none px-4 py-2 flex items-center gap-2 text-sm border-b-2 border-transparent"
                data-testid="profile-tab-identity"
              >
                <User className="h-3.5 w-3.5" />
                Identity
              </TabsTrigger>
              <TabsTrigger
                value="context"
                className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] text-[#94A3B8] rounded-none px-4 py-2 flex items-center gap-2 text-sm border-b-2 border-transparent"
                data-testid="profile-tab-context"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Context
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] text-[#94A3B8] rounded-none px-4 py-2 flex items-center gap-2 text-sm border-b-2 border-transparent"
                data-testid="profile-tab-contact"
              >
                <Phone className="h-3.5 w-3.5" />
                Contact
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] text-[#94A3B8] rounded-none px-4 py-2 flex items-center gap-2 text-sm border-b-2 border-transparent"
                data-testid="profile-tab-system"
              >
                <Settings className="h-3.5 w-3.5" />
                System
              </TabsTrigger>
              <TabsTrigger
                value="personas"
                className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#0047AB] text-[#94A3B8] rounded-none px-4 py-2 flex items-center gap-2 text-sm border-b-2 border-transparent"
                data-testid="profile-tab-personas"
              >
                <UserCircle2 className="h-3.5 w-3.5" />
                Personas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={profileTab} onValueChange={setProfileTab}>
          {/* Identity Tab */}
          <TabsContent value="identity" className="mt-0 p-6">
            <InvestmentIdentityFields
              profileData={profileData}
              setProfileData={setProfileData}
              isEditing={isEditing}
              compact={false}
            />
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context" className="mt-0 p-6">
            <InvestmentContextFields
              profileData={profileData}
              setProfileData={setProfileData}
              allFundsSPVs={allFundsSPVs}
              historicalData={historicalData}
              isEditing={isEditing}
              compact={false}
              getFundName={getFundName}
            />
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="mt-0 p-6">
            <ContactRelationshipFields
              profileData={profileData}
              setProfileData={setProfileData}
              teamMembers={teamMembers}
              isEditing={isEditing}
              compact={false}
              getTeamMemberName={getTeamMemberName}
            />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="mt-0 p-6">
            {/* System Fields - READ ONLY */}
            <div className="rounded-xl border border-[#1A2744] p-6 mb-6"
              style={{ background: 'rgba(10, 22, 40, 0.4)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[#94A3B8]" />
                  System Fields
                  <span className="text-xs bg-[#1A2744] text-[#94A3B8] px-2 py-0.5 rounded ml-2">Read Only</span>
                </h2>
              </div>

              <div className="mb-4 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
                <p className="text-xs text-[#F59E0B] flex items-center gap-2">
                  <span className="font-semibold">⚠️ Note:</span>
                  These derived values are for display only and will never write back into imported tracker columns.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] flex items-center gap-1">
                    <GitBranch className="h-3 w-3" /> Pipeline Stage
                  </Label>
                  <div className="py-2 bg-[#02040A]/40 px-3 rounded border border-[#1A2744]/50">
                    {investor.pipeline_stage_name ? (
                      <>
                        <p className={`text-sm font-medium ${getStageTextColor(investor.pipeline_stage_name)}`}>
                          {investor.pipeline_stage_name}
                        </p>
                        <span className="text-[10px] bg-[#0047AB]/20 text-[#00A3FF] px-1.5 py-0.5 rounded mt-1 inline-block">
                          ACTIVE
                        </span>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-[#94A3B8]">Not in Pipeline</p>
                        <span className="text-[10px] bg-[#475569]/20 text-[#94A3B8] px-1.5 py-0.5 rounded mt-1 inline-block">
                          UNASSIGNED
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Assigned Fund
                  </Label>
                  <div className="py-2 bg-[#02040A]/40 px-3 rounded border border-[#1A2744]/50">
                    <p className={`text-sm ${
                      resolvedFund.status === 'unmapped' ? 'text-[#F59E0B]' :
                      resolvedFund.status === 'mapped' ? 'text-[#00A3FF]' :
                      'text-white'
                    }`}>
                      {resolvedFund.label}
                    </p>
                    {resolvedFund.status === 'unmapped' && (
                      <span className="text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.5 rounded mt-1 inline-block">
                        UNMAPPED
                      </span>
                    )}
                    {resolvedFund.status === 'mapped' && (
                      <span className="text-[10px] bg-[#00A3FF]/20 text-[#00A3FF] px-1.5 py-0.5 rounded mt-1 inline-block">
                        AUTO-MAPPED
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] flex items-center gap-1">
                    <Building className="h-3 w-3" /> Assigned Office
                  </Label>
                  <div className="py-2 bg-[#02040A]/40 px-3 rounded border border-[#1A2744]/50">
                    <p className={`text-sm ${resolvedOffice.isFallback ? 'text-[#F59E0B]' : 'text-white'}`}>
                      {resolvedOffice.label}
                    </p>
                    {resolvedOffice.isFallback && (
                      <span className="text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.5 rounded mt-1 inline-block">
                        FALLBACK (User Office)
                      </span>
                    )}
                    {resolvedFund.status === 'unmapped' && !resolvedOffice.isFallback && resolvedOffice.label === 'Not Assigned' && (
                      <span className="text-[10px] bg-[#94A3B8]/20 text-[#94A3B8] px-1.5 py-0.5 rounded mt-1 inline-block">
                        Fund Unmapped
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Created Date
                  </Label>
                  <p className="text-white py-2 bg-[#02040A]/40 px-3 rounded border border-[#1A2744]/50 text-sm">
                    {formatDate(investor.created_at)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last Updated
                  </Label>
                  <p className="text-white py-2 bg-[#02040A]/40 px-3 rounded border border-[#1A2744]/50 text-sm">
                    {formatDate(investor.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence & Sources Block */}
            {investor?.id && token && API_URL && (
              <EvidenceBlock
                investorId={investor.id}
                investorName={investor.investor_name}
                token={token}
                API_URL={API_URL}
              />
            )}
          </TabsContent>

          {/* Personas Tab */}
          <TabsContent value="personas" className="mt-0 p-6">
            <PersonaMatchPanel
              investor={investor}
              selectedFund={selectedFund}
              token={token}
              API_URL={API_URL}
            />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};
