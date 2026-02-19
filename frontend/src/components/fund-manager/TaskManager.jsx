import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  ExternalLink,
  User,
  FileText,
  Plus,
  Check,
  Trash2,
  RotateCcw,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';

// Stage colors (same as kanban)
const STAGE_COLORS = {
  'Not in Pipeline': { bg: 'bg-[#475569]/20', text: 'text-[#94A3B8]', border: 'border-[#475569]', hex: '#475569' },
  'Investors': { bg: 'bg-[#475569]/20', text: 'text-[#94A3B8]', border: 'border-[#475569]', hex: '#475569' },
  'Intro Email': { bg: 'bg-[#3B82F6]/20', text: 'text-[#60A5FA]', border: 'border-[#3B82F6]', hex: '#3B82F6' },
  'Opportunity Email': { bg: 'bg-[#8B5CF6]/20', text: 'text-[#A78BFA]', border: 'border-[#8B5CF6]', hex: '#8B5CF6' },
  'Phone Call': { bg: 'bg-[#F59E0B]/20', text: 'text-[#FBBF24]', border: 'border-[#F59E0B]', hex: '#F59E0B' },
  'First Meeting': { bg: 'bg-[#EC4899]/20', text: 'text-[#F472B6]', border: 'border-[#EC4899]', hex: '#EC4899' },
  'Second Meeting': { bg: 'bg-[#22C55E]/20', text: 'text-[#4ADE80]', border: 'border-[#22C55E]', hex: '#22C55E' },
  'Follow Up Email': { bg: 'bg-[#10B981]/20', text: 'text-[#34D399]', border: 'border-[#10B981]', hex: '#10B981' },
  'Signing Contract': { bg: 'bg-[#F97316]/20', text: 'text-[#FB923C]', border: 'border-[#F97316]', hex: '#F97316' },
  'Signing Subscription': { bg: 'bg-[#06B6D4]/20', text: 'text-[#22D3EE]', border: 'border-[#06B6D4]', hex: '#06B6D4' },
  'Letter for Capital Call': { bg: 'bg-[#8B5CF6]/20', text: 'text-[#A78BFA]', border: 'border-[#8B5CF6]', hex: '#8B5CF6' },
  'Money Transfer': { bg: 'bg-[#14B8A6]/20', text: 'text-[#2DD4BF]', border: 'border-[#14B8A6]', hex: '#14B8A6' },
  'Transfer Date': { bg: 'bg-[#84CC16]/20', text: 'text-[#A3E635]', border: 'border-[#84CC16]', hex: '#84CC16' },
};

const getStageColors = (stageName) => STAGE_COLORS[stageName] || STAGE_COLORS['Investors'];

// Get initials
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Priority colors
const getPriorityStyles = (priority) => {
  switch (priority) {
    case 'high':
      return { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', label: 'High' };
    case 'medium':
      return { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Medium' };
    case 'low':
      return { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', label: 'Low' };
    default:
      return { bg: 'bg-[#94A3B8]/10', text: 'text-[#94A3B8]', label: 'Normal' };
  }
};

// Create Task Dialog Component
const CreateTaskDialog = ({ 
  open, 
  onOpenChange, 
  pipelineStages, 
  taskTemplates, 
  investors,
  onCreateTask,
  isCreating
}) => {
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedStageName, setSelectedStageName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [title, setTitle] = useState('');
  const [investorId, setInvestorId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  // Get templates for selected stage
  const stageTemplates = selectedStageName ? (taskTemplates[selectedStageName] || []) : [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedStageId('');
      setSelectedStageName('');
      setSelectedTemplate('');
      setTitle('');
      setInvestorId('');
      setPriority('medium');
      setDueDate('');
    }
  }, [open]);

  // Update title when template selected
  useEffect(() => {
    if (selectedTemplate) {
      setTitle(selectedTemplate);
    }
  }, [selectedTemplate]);

  const handleStageChange = (stageId) => {
    const stage = pipelineStages.find(s => s.id === stageId);
    setSelectedStageId(stageId);
    setSelectedStageName(stage?.name || '');
    setSelectedTemplate('');
    setTitle('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !selectedStageId) {
      toast.error('Title and stage are required');
      return;
    }
    onCreateTask({
      title: title.trim(),
      stage_id: selectedStageId,
      stage_name: selectedStageName,
      investor_id: investorId || null,
      priority,
      due_date: dueDate || null
    });
  };

  const stageColors = getStageColors(selectedStageName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#0047AB]" />
            Create Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Pipeline Stage (Required) */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Pipeline Stage *</label>
            <Select value={selectedStageId} onValueChange={handleStageChange}>
              <SelectTrigger 
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                data-testid="create-task-stage-select"
              >
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                {pipelineStages.map(stage => {
                  const colors = getStageColors(stage.name);
                  return (
                    <SelectItem 
                      key={stage.id} 
                      value={stage.id}
                      className="text-white focus:bg-[#0047AB]/20"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.hex }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Task Template */}
          {selectedStageName && stageTemplates.length > 0 && (
            <div>
              <label className="text-sm text-[#94A3B8] mb-1.5 block">Task Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger 
                  className="bg-[#02040A]/60 border-[#1A2744] text-white"
                  data-testid="create-task-template-select"
                >
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                  {stageTemplates.map(template => (
                    <SelectItem 
                      key={template} 
                      value={template}
                      className="text-white focus:bg-[#0047AB]/20"
                    >
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Task Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="create-task-title-input"
            />
          </div>

          {/* Related Investor (Optional) */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Related Investor (Optional)</label>
            <Select value={investorId} onValueChange={setInvestorId}>
              <SelectTrigger 
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                data-testid="create-task-investor-select"
              >
                <SelectValue placeholder="Select an investor" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-[200px]">
                <SelectItem value="none" className="text-[#94A3B8] focus:bg-[#0047AB]/20">
                  No investor
                </SelectItem>
                {investors.map(investor => (
                  <SelectItem 
                    key={investor.id} 
                    value={investor.id}
                    className="text-white focus:bg-[#0047AB]/20"
                  >
                    {investor.investor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger 
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                data-testid="create-task-priority-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                <SelectItem value="low" className="text-white focus:bg-[#0047AB]/20">
                  <span className="text-[#3B82F6]">Low</span>
                </SelectItem>
                <SelectItem value="medium" className="text-white focus:bg-[#0047AB]/20">
                  <span className="text-[#F59E0B]">Medium</span>
                </SelectItem>
                <SelectItem value="high" className="text-white focus:bg-[#0047AB]/20">
                  <span className="text-[#EF4444]">High</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Complete By (Optional)</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="create-task-due-date-input"
            />
          </div>

          {/* Preview */}
          {selectedStageName && (
            <div className="pt-2">
              <p className="text-xs text-[#94A3B8] mb-2">Preview:</p>
              <div 
                className={`rounded-lg p-3 border-l-4`}
                style={{ 
                  background: 'rgba(2, 4, 10, 0.4)',
                  borderLeftColor: stageColors.hex 
                }}
              >
                <p className="text-white font-medium text-sm">{title || 'Task title'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${stageColors.bg} ${stageColors.text}`}>
                    {selectedStageName}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityStyles(priority).bg} ${getPriorityStyles(priority).text}`}>
                    {getPriorityStyles(priority).label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[#94A3B8]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !selectedStageId || isCreating}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="create-task-submit-btn"
            >
              {isCreating ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const TaskManager = ({
  fundId,
  fundName,
  token,
  API_URL,
  onViewInvestor,
  onTaskCountChange,
  pipelineStages = [],
  investors = []
}) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDueDate, setEditingDueDate] = useState(null);
  const [dueDateValue, setDueDateValue] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [systemTasksCount, setSystemTasksCount] = useState(0);
  const [userTasksCount, setUserTasksCount] = useState(0);

  // Fetch task templates
  const fetchTaskTemplates = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/task-templates`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTaskTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch task templates:', error);
    }
  }, [token, API_URL]);

  const fetchTasks = useCallback(async () => {
    if (!fundId) return;
    
    setLoading(true);
    try {
      // Fetch combined tasks (system + user)
      const response = await axios.get(
        `${API_URL}/api/funds/${fundId}/all-tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(response.data.tasks || []);
      setSystemTasksCount(response.data.system_tasks_count || 0);
      setUserTasksCount(response.data.user_tasks_count || 0);
      
      // Notify parent of task count change
      if (onTaskCountChange) {
        onTaskCountChange(response.data.total_tasks || 0);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [fundId, token, API_URL, onTaskCountChange]);

  useEffect(() => {
    fetchTasks();
    fetchTaskTemplates();
  }, [fetchTasks, fetchTaskTemplates]);

  const handleSetDueDate = async (task) => {
    try {
      if (task.is_user_created) {
        // Update user task due date
        await axios.put(
          `${API_URL}/api/user-tasks/${task.id}`,
          { due_date: dueDateValue || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Update system task due date
        await axios.put(
          `${API_URL}/api/tasks/due-date`,
          { task_id: task.id, due_date: dueDateValue || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast.success('Due date updated');
      setEditingDueDate(null);
      setDueDateValue('');
      fetchTasks();
    } catch (error) {
      console.error('Failed to update due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const handleCreateTask = async (taskData) => {
    setIsCreating(true);
    try {
      await axios.post(
        `${API_URL}/api/funds/${fundId}/user-tasks`,
        taskData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Task created');
      setShowCreateDialog(false);
      fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await axios.put(
        `${API_URL}/api/user-tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Task completed');
      fetchTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(
        `${API_URL}/api/user-tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="task-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Task Manager</h1>
          <p className="text-[#94A3B8]">{fundName} • {systemTasksCount} system + {userTasksCount} manual tasks</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
          data-testid="create-task-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">Total Tasks</p>
          <p className="text-2xl font-bold text-white">{tasks.length}</p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">System Tasks</p>
          <p className="text-2xl font-bold text-[#8B5CF6]">{systemTasksCount}</p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">Manual Tasks</p>
          <p className="text-2xl font-bold text-[#3B82F6]">{userTasksCount}</p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">High Priority</p>
          <p className="text-2xl font-bold text-[#EF4444]">
            {tasks.filter(t => t.priority === 'high').length}
          </p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">Overdue</p>
          <p className="text-2xl font-bold text-[#F59E0B]">
            {tasks.filter(t => t.is_overdue).length}
          </p>
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div 
          className="rounded-xl p-8 border border-[#1A2744] text-center"
          style={{ background: 'rgba(2, 4, 10, 0.4)' }}
        >
          <CheckCircle2 className="h-12 w-12 text-[#22C55E] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">All caught up!</h3>
          <p className="text-[#94A3B8] text-sm mb-4">
            No pending tasks. Create a new task to get started.
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            variant="outline"
            className="border-[#1A2744] text-white hover:bg-[#0047AB]/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const stageColors = getStageColors(task.pipeline_stage || task.stage_name);
            const priorityStyles = getPriorityStyles(task.priority);
            const isUserTask = task.is_user_created;
            
            return (
              <div
                key={task.id}
                className={`rounded-xl p-4 border-l-4 transition-colors ${
                  task.is_overdue 
                    ? 'border-[#1A2744] bg-[#EF4444]/5' 
                    : 'border-[#1A2744] hover:border-[#0047AB]/50'
                }`}
                style={{ 
                  background: task.is_overdue ? undefined : 'rgba(2, 4, 10, 0.4)',
                  borderLeftColor: stageColors.hex
                }}
                data-testid={`task-${task.id}`}
              >
                <div className="flex items-start gap-4">
                  {/* Task Icon */}
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    isUserTask ? 'bg-[#3B82F6]/20' :
                    task.type === 'missing_investment_size' ? 'bg-[#EF4444]/20' :
                    task.type === 'missing_expected_ticket' ? 'bg-[#F59E0B]/20' :
                    task.type === 'unknown_relationship_strength' ? 'bg-[#EC4899]/20' :
                    task.type === 'unknown_decision_role' ? 'bg-[#06B6D4]/20' :
                    'bg-[#8B5CF6]/20'
                  }`}>
                    {isUserTask ? (
                      <ClipboardList className="h-5 w-5 text-[#3B82F6]" />
                    ) : task.type === 'missing_investment_size' ? (
                      <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                    ) : task.type === 'missing_expected_ticket' ? (
                      <FileText className="h-5 w-5 text-[#F59E0B]" />
                    ) : task.type === 'unknown_relationship_strength' ? (
                      <User className="h-5 w-5 text-[#EC4899]" />
                    ) : task.type === 'unknown_decision_role' ? (
                      <User className="h-5 w-5 text-[#06B6D4]" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
                    )}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {/* Task Description/Title */}
                        <h3 className="text-white font-medium mb-1">
                          {task.title || task.description}
                        </h3>
                        {task.detail && (
                          <p className="text-xs text-[#94A3B8] mb-2">
                            {task.detail}
                          </p>
                        )}
                        
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Investor Info (if linked) */}
                          {(task.investor_name || task.investor_id) && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="bg-[#0047AB] text-white text-[10px]">
                                  {getInitials(task.investor_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-[#94A3B8]">
                                {task.investor_name || task.investor_type}
                              </span>
                            </div>
                          )}
                          
                          {/* Pipeline Stage Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${stageColors.bg} ${stageColors.text}`}>
                            {task.pipeline_stage || task.stage_name}
                          </span>
                          
                          {/* Priority Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${priorityStyles.bg} ${priorityStyles.text}`}>
                            {priorityStyles.label}
                          </span>
                          
                          {/* Task Type Badge */}
                          {task.is_auto_generated ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#8B5CF6]/10 text-[#8B5CF6]">
                              ⚡ Auto
                            </span>
                          ) : isUserTask ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#3B82F6]/10 text-[#3B82F6]">
                              Manual
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#475569]/20 text-[#94A3B8]">
                              System
                            </span>
                          )}
                          
                          {/* Overdue Badge */}
                          {task.is_overdue && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#EF4444]/20 text-[#EF4444]">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Due Date & Actions */}
                      <div className="flex flex-col items-end gap-2">
                        {/* Due Date */}
                        {editingDueDate === task.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={dueDateValue}
                              onChange={(e) => setDueDateValue(e.target.value)}
                              className="bg-[#02040A]/60 border-[#1A2744] text-white text-xs h-8 w-32"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSetDueDate(task)}
                              className="h-8 px-2 text-xs"
                              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingDueDate(null);
                                setDueDateValue('');
                              }}
                              className="h-8 px-2 text-xs text-[#94A3B8]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingDueDate(task.id);
                              setDueDateValue(task.due_date || '');
                            }}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-[#1A2744] transition-colors ${
                              task.due_date 
                                ? task.is_overdue ? 'text-[#EF4444]' : 'text-[#94A3B8]'
                                : 'text-[#475569]'
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {task.due_date ? formatDate(task.due_date) : 'Set due date'}
                          </button>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {isUserTask && (
                            <>
                              {/* Complete Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCompleteTask(task.id)}
                                className="text-[#22C55E] hover:bg-[#22C55E]/20 h-8 px-2"
                                data-testid={`complete-task-${task.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              
                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-[#EF4444] hover:bg-[#EF4444]/20 h-8 px-2"
                                data-testid={`delete-task-${task.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {/* Fix/View Button (only for system tasks with investor) */}
                          {(!isUserTask || task.investor_id) && onViewInvestor && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onViewInvestor(task)}
                              className="text-[#00A3FF] hover:bg-[#0047AB]/20 h-8"
                              data-testid={`fix-task-${task.id}`}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              {isUserTask ? 'View' : 'Fix'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        pipelineStages={pipelineStages}
        taskTemplates={taskTemplates}
        investors={investors}
        onCreateTask={handleCreateTask}
        isCreating={isCreating}
      />
    </div>
  );
};
