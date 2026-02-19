import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LogOut, Briefcase, Users, GitBranch, LayoutDashboard, Bell, ClipboardList, MessageSquare, Radar, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InvestorList,
  InvestorProfile,
  CreateInvestorDialog,
  DeleteInvestorDialog,
  PipelineBoard,
  CapitalOverview,
  TaskManager,
  CommunicationCenter,
  ResearchCapture,
  PersonaManager,
  emptyProfile,
  getInitials
} from '@/components/fund-manager';
import GlobalInvestorBrowser from '@/components/fund-manager/GlobalInvestorBrowser';
import ImportWizard from '@/components/fund-manager/ImportWizard';
import { useFundData } from '@/hooks/useFundData';
import { useInvestorData } from '@/hooks/useInvestorData';
import { useTaskCount } from '@/hooks/useTaskCount';
import { usePersonaData } from '@/hooks/usePersonaData';

const LOGO_URL = "https://cdn.prod.website-files.com/66c1ff66234911f96b0e0367/66d5ccad639d4c3a5079e64e_ALKNZ_Main%20logo.svg";

const FundManagerDashboard = () => {
  const { user, logout, token, API_URL } = useAuth();
  const navigate = useNavigate();

  // UI-only state
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showGlobalBrowser, setShowGlobalBrowser] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Data hooks
  const {
    funds,
    allFundsSPVs,
    teamMembers,
    selectedFund,
    setSelectedFund,
    loading,
    getFundName,
    getTeamMemberName,
    getOfficeName,
  } = useFundData(token, API_URL);

  const {
    investors,
    selectedInvestor,
    profileData,
    setProfileData,
    isEditing,
    setIsEditing,
    isSaving,
    historicalData,
    loadingInvestors,
    pipelineStages,
    fetchFundData,
    handleSelectInvestor,
    handleCreateInvestor,
    handleUpdateInvestor,
    handleDeleteInvestor,
    handleQuickDelete,
  } = useInvestorData(selectedFund, token, API_URL);

  const { taskCount, setTaskCount } = useTaskCount(selectedFund, token, API_URL);

  const { scoreInvestorClientSide } = usePersonaData(selectedFund?.id, token, API_URL);

  // Compute top persona match per investor (client-side, for badges in the investor list)
  const personaBadges = useMemo(() => {
    const map = {};
    investors.forEach(inv => {
      const scores = scoreInvestorClientSide(inv);
      if (scores.length > 0) map[inv.id] = scores[0];
    });
    return map;
  }, [investors, scoreInvestorClientSide]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddClick = () => {
    setProfileData(emptyProfile);
    setShowCreateDialog(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    handleSelectInvestor(selectedInvestor);
  };

  const handleCreateAndClose = async () => {
    const success = await handleCreateInvestor();
    if (success) {
      setShowCreateDialog(false);
      setProfileData(emptyProfile);
    }
  };

  const handleConfirmDelete = async () => {
    await handleDeleteInvestor();
    setShowDeleteDialog(false);
  };

  // After a research capture is accepted: refresh list, switch tab, auto-select new investor
  const handleCaptureAccepted = async (acceptResponse) => {
    const updatedInvestors = await fetchFundData();
    setActiveTab('investors');
    if (acceptResponse?.investor_id && updatedInvestors) {
      const found = updatedInvestors.find(i => i.id === acceptResponse.investor_id);
      if (found) handleSelectInvestor(found);
    }
  };

  const handlePipelineInvestorClick = (investor) => {
    setActiveTab('investors');
    handleSelectInvestor(investor);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" data-testid="fund-manager-dashboard"
      style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
    >
      {/* Header */}
      <header className="border-b border-[#1A2744] flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #02040A 0%, #0A0A1F 100%)' }}
      >
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="ALKNZ Ventures" className="h-7 w-auto" />

            {funds.length > 0 && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#94A3B8]" />
                <Select
                  value={selectedFund?.id}
                  onValueChange={(value) => setSelectedFund(funds.find(f => f.id === value))}
                >
                  <SelectTrigger className="w-[180px] h-8 bg-[#02040A]/60 border-[#1A2744] text-white text-sm" data-testid="fund-selector">
                    <SelectValue placeholder="Select Fund" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                    {funds.map(fund => (
                      <SelectItem key={fund.id} value={fund.id} className="text-white focus:bg-[#0047AB]/20">
                        {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/feedback')}
              className="p-2 rounded-lg hover:bg-[#1A2744] transition-colors"
              title="Share feedback"
              data-testid="feedback-button"
            >
              <ClipboardList className="h-5 w-5 text-[#94A3B8]" />
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className="relative p-2 rounded-lg hover:bg-[#1A2744] transition-colors"
              data-testid="task-bell-button"
            >
              <Bell className={`h-5 w-5 ${taskCount > 0 ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`} />
              {taskCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#EF4444] text-white text-[10px] font-bold rounded-full px-1">
                  {taskCount > 99 ? '99+' : taskCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url ? `${API_URL}${user.avatar_url}` : undefined} />
                <AvatarFallback className="bg-[#0047AB] text-white text-xs">
                  {getInitials(`${user?.first_name} ${user?.last_name}`)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-[#94A3B8]">Fund Manager</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 h-8 w-8 p-0"
              data-testid="fm-logout-button"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {funds.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Briefcase className="h-16 w-16 text-[#94A3B8] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Funds Assigned</h2>
              <p className="text-[#94A3B8]">Contact your admin to get access to funds.</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[#1A2744] px-4 flex-shrink-0">
              <TabsList className="bg-transparent border-0 h-10">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-overview"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Capital Overview
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-tasks"
                >
                  <ClipboardList className="h-4 w-4" />
                  Task Manager
                  {taskCount > 0 && (
                    <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#EF4444] text-white text-[10px] font-bold rounded-full px-1">
                      {taskCount > 99 ? '99+' : taskCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="investors"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-investors"
                >
                  <Users className="h-4 w-4" />
                  Investor Profiles
                </TabsTrigger>
                <TabsTrigger
                  value="pipeline"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-pipeline"
                >
                  <GitBranch className="h-4 w-4" />
                  Fundraising Pipeline
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-communications"
                >
                  <MessageSquare className="h-4 w-4" />
                  Communication Center
                </TabsTrigger>
                <TabsTrigger
                  value="research"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-research"
                >
                  <Radar className="h-4 w-4" />
                  Research Capture
                </TabsTrigger>
                <TabsTrigger
                  value="personas"
                  className="data-[state=active]:bg-[#0047AB]/20 data-[state=active]:text-white text-[#94A3B8] rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  data-testid="tab-personas"
                >
                  <UserCircle2 className="h-4 w-4" />
                  Personas
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden">
              <CapitalOverview
                fundId={selectedFund?.id}
                fundName={selectedFund?.name}
                token={token}
                API_URL={API_URL}
                onViewInvestor={(investor) => {
                  setActiveTab('investors');
                  const found = investors.find(i => i.id === investor.id);
                  if (found) {
                    handleSelectInvestor(found);
                    setIsEditing(true);
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 mt-0 overflow-hidden">
              <TaskManager
                fundId={selectedFund?.id}
                fundName={selectedFund?.name}
                token={token}
                API_URL={API_URL}
                pipelineStages={pipelineStages}
                investors={investors}
                onViewInvestor={(task) => {
                  setActiveTab('investors');
                  const found = investors.find(i => i.id === task.investor_id);
                  if (found) {
                    handleSelectInvestor(found);
                    setIsEditing(true);
                  }
                }}
                onTaskCountChange={setTaskCount}
              />
            </TabsContent>

            <TabsContent value="investors" className="flex-1 !flex !flex-row mt-0 overflow-hidden h-full">
              <InvestorList
                investors={investors}
                selectedInvestor={selectedInvestor}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                loading={loadingInvestors}
                onSelectInvestor={handleSelectInvestor}
                onAddClick={handleAddClick}
                onBrowseGlobal={() => setShowGlobalBrowser(true)}
                onImportCSV={() => setShowImportWizard(true)}
                onQuickDelete={handleQuickDelete}
                pipelineStages={pipelineStages}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                personaBadges={personaBadges}
              />

              <div className="flex-1 overflow-y-auto h-full">
                <AnimatePresence mode="wait">
                  <InvestorProfile
                    investor={selectedInvestor}
                    profileData={profileData}
                    setProfileData={setProfileData}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isSaving={isSaving}
                    onSave={handleUpdateInvestor}
                    onDelete={() => setShowDeleteDialog(true)}
                    onCancel={handleCancelEdit}
                    historicalData={historicalData}
                    allFundsSPVs={allFundsSPVs}
                    teamMembers={teamMembers}
                    selectedFund={selectedFund}
                    currentUser={user}
                    helpers={{ getFundName, getTeamMemberName, getOfficeName }}
                    token={token}
                    API_URL={API_URL}
                  />
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent
              value="pipeline"
              className="flex-1 mt-0"
              style={{ height: 'calc(100vh - 90px)', minHeight: 'calc(100vh - 90px)' }}
            >
              {loadingInvestors ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
                </div>
              ) : (
                <div className="h-full">
                  <PipelineBoard
                    fundId={selectedFund?.id}
                    stages={pipelineStages}
                    investors={investors}
                    teamMembers={teamMembers}
                    token={token}
                    API_URL={API_URL}
                    onInvestorClick={handlePipelineInvestorClick}
                    onRefresh={fetchFundData}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="communications" className="flex-1 mt-0 overflow-hidden">
              <CommunicationCenter
                fundId={selectedFund?.id}
                fundName={selectedFund?.name}
                token={token}
                API_URL={API_URL}
                investors={investors}
              />
            </TabsContent>

            <TabsContent value="research" className="flex-1 mt-0 overflow-hidden">
              <ResearchCapture
                selectedFund={selectedFund}
                token={token}
                API_URL={API_URL}
                onNavigateToInvestor={handleCaptureAccepted}
              />
            </TabsContent>

            <TabsContent value="personas" className="flex-1 mt-0 overflow-auto">
              <div className="p-6 h-full">
                <PersonaManager
                  selectedFund={selectedFund}
                  token={token}
                  API_URL={API_URL}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <CreateInvestorDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setProfileData(emptyProfile);
        }}
        profileData={profileData}
        setProfileData={setProfileData}
        allFundsSPVs={allFundsSPVs}
        teamMembers={teamMembers}
        selectedFund={selectedFund}
        onSubmit={handleCreateAndClose}
        isSaving={isSaving}
      />

      <DeleteInvestorDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        investorName={selectedInvestor?.investor_name}
        onConfirm={handleConfirmDelete}
      />

      <GlobalInvestorBrowser
        open={showGlobalBrowser}
        onClose={() => setShowGlobalBrowser(false)}
        selectedFund={selectedFund}
        token={token}
        API_URL={API_URL}
        onRequestSuccess={() => {}}
      />

      <ImportWizard
        open={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        selectedFund={selectedFund}
        token={token}
        API_URL={API_URL}
        onImportSuccess={(count) => {
          fetchFundData();
        }}
      />
    </div>
  );
};

export default FundManagerDashboard;
