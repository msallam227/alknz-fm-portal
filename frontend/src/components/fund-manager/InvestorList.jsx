import React, { useState } from 'react';
import { Users, Plus, Search, User, Globe, FileUp, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from './constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Pipeline stage color mapping
const getStageColor = (stageName) => {
  const stageColors = {
    'Investors': 'bg-[#475569]/20 text-[#94A3B8]',
    'Intro Email': 'bg-[#3B82F6]/20 text-[#60A5FA]',
    'Opportunity Email': 'bg-[#8B5CF6]/20 text-[#A78BFA]',
    'Phone Call': 'bg-[#F59E0B]/20 text-[#FBBF24]',
    'First Meeting': 'bg-[#EC4899]/20 text-[#F472B6]',
    'Second Meeting': 'bg-[#22C55E]/20 text-[#4ADE80]',
    'Follow Up Email': 'bg-[#10B981]/20 text-[#34D399]',
    'Signing Contract': 'bg-[#F97316]/20 text-[#FB923C]',
    'Signing Subscription': 'bg-[#06B6D4]/20 text-[#22D3EE]',
    'Letter for Capital Call': 'bg-[#8B5CF6]/20 text-[#A78BFA]',
    'Money Transfer': 'bg-[#14B8A6]/20 text-[#2DD4BF]',
    'Transfer Date': 'bg-[#84CC16]/20 text-[#A3E635]',
  };
  return stageColors[stageName] || 'bg-[#475569]/20 text-[#94A3B8]';
};

export const InvestorList = ({
  investors,
  selectedInvestor,
  searchQuery,
  setSearchQuery,
  loading,
  onSelectInvestor,
  onAddClick,
  onBrowseGlobal,
  onImportCSV,
  onQuickDelete,
  pipelineStages = [],
  isCollapsed = false,
  onToggleCollapse,
  personaBadges = {}
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const filteredInvestors = investors.filter(inv =>
    inv.investor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.investor_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.pipeline_stage_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickDelete = (e, investor) => {
    e.stopPropagation();
    if (confirmDeleteId === investor.id) {
      // Second click - confirm delete
      onQuickDelete && onQuickDelete(investor);
      setConfirmDeleteId(null);
    } else {
      // First click - show confirm state
      setConfirmDeleteId(investor.id);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  // Collapsed view - just show avatars
  if (isCollapsed) {
    return (
      <aside 
        className="w-16 border-r border-[#1A2744] flex flex-col h-full flex-shrink-0 transition-all duration-300"
        style={{ background: 'rgba(2, 4, 10, 0.5)' }}
      >
        {/* Collapsed Header */}
        <div className="p-2 border-b border-[#1A2744] flex flex-col items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleCollapse}
                  className="text-[#94A3B8] hover:text-white hover:bg-[#0047AB]/20 h-8 w-8 p-0"
                  data-testid="expand-sidebar-button"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onAddClick}
                  className="text-white h-8 w-8 p-0"
                  style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                  data-testid="add-investor-button-collapsed"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Add Investor</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Collapsed Investor List - Just Avatars */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredInvestors.map(investor => (
            <TooltipProvider key={investor.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectInvestor(investor)}
                    className={`w-full flex justify-center p-1 rounded-lg transition-colors ${
                      selectedInvestor?.id === investor.id
                        ? 'bg-[#0047AB]/30 ring-2 ring-[#0047AB]'
                        : 'hover:bg-[#0047AB]/10'
                    }`}
                    data-testid={`investor-item-collapsed-${investor.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#002D72] text-white text-sm">
                        {getInitials(investor.investor_name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{investor.investor_name}</p>
                  <p className="text-xs text-muted-foreground">{investor.investor_type}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </aside>
    );
  }

  // Expanded view - full sidebar
  return (
    <aside 
      className="w-80 border-r border-[#1A2744] flex flex-col h-full flex-shrink-0 transition-all duration-300"
      style={{ background: 'rgba(2, 4, 10, 0.5)' }}
    >
      <div className="p-4 border-b border-[#1A2744]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#00A3FF]" />
            Investors
          </h2>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onToggleCollapse}
                      className="text-[#94A3B8] hover:text-white hover:bg-[#0047AB]/20 h-8 px-2"
                      data-testid="collapse-sidebar-button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Collapse sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onBrowseGlobal && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBrowseGlobal}
                className="bg-transparent border-[#1A2744] text-[#00A3FF] hover:bg-[#0047AB]/20 h-8 px-2"
                data-testid="browse-global-button"
                title="Browse & Request Global Investors"
              >
                <Globe className="h-4 w-4" />
              </Button>
            )}
            {onImportCSV && (
              <Button
                size="sm"
                variant="outline"
                onClick={onImportCSV}
                className="bg-transparent border-[#1A2744] text-[#22C55E] hover:bg-[#22C55E]/20 h-8 px-2"
                data-testid="import-csv-button"
                title="Import Investors from CSV"
              >
                <FileUp className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={onAddClick}
              className="text-white h-8 px-2"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="add-investor-button"
              title="Add New Investor"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Search investors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569]"
            data-testid="search-investors-input"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0047AB]"></div>
          </div>
        ) : filteredInvestors.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-[#94A3B8] mx-auto mb-2" />
            <p className="text-[#94A3B8] text-sm">No investors found</p>
            <p className="text-[#475569] text-xs mt-1">Add your first investor or import from CSV</p>
            <div className="flex flex-col gap-2 mt-3">
              {onImportCSV && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onImportCSV}
                  className="bg-transparent border-[#1A2744] text-[#22C55E] hover:bg-[#22C55E]/20"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Import from CSV
                </Button>
              )}
              {onBrowseGlobal && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBrowseGlobal}
                  className="bg-transparent border-[#1A2744] text-[#00A3FF] hover:bg-[#0047AB]/20"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Browse Global Investors
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredInvestors.map(investor => (
              <div
                key={investor.id}
                className={`group relative w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
                  selectedInvestor?.id === investor.id
                    ? 'bg-[#0047AB]/20 border border-[#0047AB]'
                    : 'hover:bg-[#0047AB]/10 border border-transparent'
                }`}
                onClick={() => onSelectInvestor(investor)}
                data-testid={`investor-item-${investor.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-[#002D72] text-white text-sm">
                      {getInitials(investor.investor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {investor.investor_name}
                    </p>
                    <p className="text-[#94A3B8] text-xs truncate">
                      {investor.investor_type} {investor.country && `• ${investor.country}`}
                    </p>
                    {/* Pipeline Status Badge */}
                    {investor.pipeline_stage_name && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${getStageColor(investor.pipeline_stage_name)}`}>
                        {investor.pipeline_stage_name}
                      </span>
                    )}
                    {/* Persona Match Badge */}
                    {personaBadges[investor.id] && personaBadges[investor.id].score >= 30 && (
                      <span className={`inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                        personaBadges[investor.id].score >= 80
                          ? 'bg-green-500/20 text-green-400'
                          : personaBadges[investor.id].score >= 50
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-[#475569]/20 text-[#94A3B8]'
                      }`}>
                        {personaBadges[investor.id].score}% {personaBadges[investor.id].persona_name}
                      </span>
                    )}
                  </div>
                  
                  {/* Quick Delete Button */}
                  {onQuickDelete && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmDeleteId === investor.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleQuickDelete(e, investor)}
                            className="h-7 px-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 text-xs"
                            data-testid={`confirm-delete-${investor.id}`}
                          >
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelDelete}
                            className="h-7 w-7 p-0 text-[#94A3B8] hover:text-white hover:bg-[#1A2744]"
                            data-testid={`cancel-delete-${investor.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleQuickDelete(e, investor)}
                                className="h-7 w-7 p-0 text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10"
                                data-testid={`quick-delete-${investor.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Quick delete</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
