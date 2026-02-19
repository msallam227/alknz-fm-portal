import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { PipelineCard } from './PipelineCard';
import { InvestorMiniProfile } from './InvestorMiniProfile';

// Stage column colors
const STAGE_COLORS = {
  'Investors': '#475569',
  'Intro Email': '#3B82F6',
  'Opportunity Email': '#8B5CF6',
  'Phone Call': '#F59E0B',
  'First Meeting': '#EC4899',
  'Second Meeting': '#22C55E',
  'Follow Up Email': '#10B981',
  'Signing Contract': '#F97316',
  'Signing Subscription': '#06B6D4',
  'Letter for Capital Call': '#8B5CF6',
  'Money Transfer': '#14B8A6',
  'Transfer Date': '#84CC16',
};

const getStageColor = (stageName) => STAGE_COLORS[stageName] || '#475569';

export const PipelineBoard = ({
  fundId,
  stages,
  investors,
  teamMembers,
  token,
  API_URL,
  onInvestorClick,
  onRefresh
}) => {
  const [boardData, setBoardData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [showMiniProfile, setShowMiniProfile] = useState(false);

  // Organize investors into columns by stage
  useEffect(() => {
    const columns = {};
    
    // Initialize all stage columns
    stages.forEach(stage => {
      columns[stage.id] = {
        stage,
        investors: []
      };
    });

    // Add a "Not in Pipeline" column for investors without a stage
    columns['unassigned'] = {
      stage: { id: 'unassigned', name: 'Not in Pipeline', position: -1 },
      investors: []
    };

    // Distribute investors to their stages
    investors.forEach(investor => {
      const stageId = investor.pipeline_stage_id || 'unassigned';
      if (columns[stageId]) {
        columns[stageId].investors.push(investor);
      } else {
        columns['unassigned'].investors.push(investor);
      }
    });

    // Sort investors within each column by position
    Object.values(columns).forEach(col => {
      col.investors.sort((a, b) => (a.pipeline_position || 0) - (b.pipeline_position || 0));
    });

    setBoardData(columns);
  }, [stages, investors]);

  // Handle drag end
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the investor
    const investor = investors.find(i => i.id === draggableId);
    if (!investor) return;

    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;

    // Optimistically update the UI
    const newBoardData = { ...boardData };
    
    // Remove from source
    const sourceInvestors = [...newBoardData[sourceStageId].investors];
    sourceInvestors.splice(source.index, 1);
    newBoardData[sourceStageId] = {
      ...newBoardData[sourceStageId],
      investors: sourceInvestors
    };

    // Add to destination
    const destInvestors = [...newBoardData[destStageId].investors];
    const movedInvestor = {
      ...investor,
      pipeline_stage_id: destStageId === 'unassigned' ? null : destStageId,
      pipeline_position: destination.index
    };
    destInvestors.splice(destination.index, 0, movedInvestor);
    newBoardData[destStageId] = {
      ...newBoardData[destStageId],
      investors: destInvestors
    };

    setBoardData(newBoardData);

    // Update backend
    setIsUpdating(true);
    try {
      if (destStageId === 'unassigned') {
        // Remove from pipeline
        const pipelineEntry = await axios.get(
          `${API_URL}/api/investor-pipeline/${investor.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (pipelineEntry.data.stage_id) {
          // Find and delete the pipeline entry
          const allPipeline = await axios.get(
            `${API_URL}/api/funds/${fundId}/investor-pipeline`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const entry = allPipeline.data.find(p => p.investor_id === investor.id);
          if (entry) {
            await axios.delete(
              `${API_URL}/api/investor-pipeline/${entry.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
      } else {
        // Move to new stage
        await axios.put(
          `${API_URL}/api/investor-pipeline/move/${investor.id}?fund_id=${fundId}&new_stage_id=${destStageId}&new_position=${destination.index}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success(`Moved to ${newBoardData[destStageId].stage.name}`);
      
      // Refresh data to sync positions
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to update pipeline:', error);
      toast.error('Failed to update pipeline');
      // Revert on error
      if (onRefresh) onRefresh();
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle card click - open mini profile
  const handleCardClick = (investor) => {
    setSelectedInvestor(investor);
    setShowMiniProfile(true);
  };

  // Handle view full profile - navigate to full profile
  const handleViewFullProfile = (investor) => {
    onInvestorClick(investor);
  };

  // Get column order (unassigned first, then by position)
  const orderedColumns = Object.entries(boardData)
    .sort(([, a], [, b]) => {
      if (a.stage.id === 'unassigned') return -1;
      if (b.stage.id === 'unassigned') return 1;
      return a.stage.position - b.stage.position;
    });

  return (
    <div className="w-full overflow-hidden" style={{ height: 'calc(100vh - 90px)' }}>
      {/* Kanban Board - Full height columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-2 p-2 overflow-x-auto h-full">
          {orderedColumns.map(([columnId, column]) => (
            <div
              key={columnId}
              className="flex flex-col min-w-[140px] w-[140px] flex-shrink-0 rounded-lg"
              style={{ 
                background: 'rgba(2, 4, 10, 0.5)',
                height: 'calc(100vh - 110px)'
              }}
            >
              {/* Column Header */}
              <div 
                className="p-2 border-b border-[#1A2744] rounded-t-lg flex-shrink-0"
                style={{ 
                  borderTop: `3px solid ${getStageColor(column.stage.name)}` 
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <h3 className="font-medium text-white text-xs truncate" title={column.stage.name}>
                      {column.stage.name}
                    </h3>
                    <span className="text-[10px] bg-[#1A2744] text-[#94A3B8] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {column.investors.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Column Content - Cards only */}
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-1.5 space-y-1.5 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-[#0047AB]/10' : ''
                    }`}
                  >
                    {column.investors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="h-6 w-6 text-[#475569] mb-1" />
                        <p className="text-[10px] text-[#475569] px-1">
                          {columnId === 'unassigned' 
                            ? 'Drop here to remove'
                            : 'Drop investors here'
                          }
                        </p>
                      </div>
                    ) : (
                      column.investors.map((investor, index) => (
                        <Draggable
                          key={investor.id}
                          draggableId={investor.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : ''} transition-transform`}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <PipelineCard
                                investor={investor}
                                teamMembers={teamMembers}
                                onClick={() => handleCardClick(investor)}
                                compact={true}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Mini Profile Slide-over */}
      <InvestorMiniProfile
        investor={selectedInvestor}
        open={showMiniProfile}
        onOpenChange={setShowMiniProfile}
        teamMembers={teamMembers}
        token={token}
        API_URL={API_URL}
        onViewFullProfile={handleViewFullProfile}
      />
    </div>
  );
};
