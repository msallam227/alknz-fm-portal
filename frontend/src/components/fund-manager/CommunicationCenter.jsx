import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Phone,
  FileText,
  Search,
  Plus,
  Filter,
  Clock,
  User,
  X,
  Check,
  Calendar,
  MessageSquare,
  ArrowRight,
  PhoneCall,
  PhoneOff,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Trash2,
  Edit2,
  ClipboardList,
  Link2,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wifi,
  WifiOff,
  Copy,
  Eye,
  MailOpen,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import axios from 'axios';
import { toast } from 'sonner';

// Get initials
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format datetime
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Outcome icons and colors
const OUTCOME_CONFIG = {
  no_answer: { 
    icon: PhoneOff, 
    label: 'No Answer', 
    bg: 'bg-[#94A3B8]/10', 
    text: 'text-[#94A3B8]',
    border: 'border-[#94A3B8]'
  },
  connected: { 
    icon: Phone, 
    label: 'Connected', 
    bg: 'bg-[#3B82F6]/10', 
    text: 'text-[#3B82F6]',
    border: 'border-[#3B82F6]'
  },
  interested: { 
    icon: ThumbsUp, 
    label: 'Interested', 
    bg: 'bg-[#22C55E]/10', 
    text: 'text-[#22C55E]',
    border: 'border-[#22C55E]'
  },
  not_interested: { 
    icon: ThumbsDown, 
    label: 'Not Interested', 
    bg: 'bg-[#EF4444]/10', 
    text: 'text-[#EF4444]',
    border: 'border-[#EF4444]'
  },
  follow_up_needed: { 
    icon: RefreshCw, 
    label: 'Follow-up Needed', 
    bg: 'bg-[#F59E0B]/10', 
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]'
  }
};

// Empty State Component
const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <div 
    className="flex-1 flex items-center justify-center p-8"
    style={{ minHeight: '400px' }}
  >
    <div className="text-center max-w-md">
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'linear-gradient(135deg, #0047AB20 0%, #0052CC20 100%)' }}
      >
        <Icon className="h-8 w-8 text-[#0047AB]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-[#94A3B8] text-sm mb-6">{description}</p>
      {actionLabel && (
        <Button
          onClick={onAction}
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
          data-testid="empty-state-action-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  </div>
);

// Create/Edit Call Log Dialog
const CallLogDialog = ({ 
  open, 
  onOpenChange, 
  investors, 
  onSave, 
  editingLog = null,
  isSaving 
}) => {
  const [investorId, setInvestorId] = useState('');
  const [callDateTime, setCallDateTime] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [createTask, setCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Get selected investor name
  const selectedInvestor = investors.find(i => i.id === investorId);

  // Reset form when dialog opens/closes or editing log changes
  useEffect(() => {
    if (open) {
      if (editingLog) {
        setInvestorId(editingLog.investor_id || '');
        setCallDateTime(editingLog.call_datetime ? editingLog.call_datetime.slice(0, 16) : '');
        setOutcome(editingLog.outcome || '');
        setNotes(editingLog.notes || '');
        setNextStep(editingLog.next_step || '');
        setCreateTask(false);
        setTaskTitle('');
        setTaskPriority('medium');
        setTaskDueDate('');
      } else {
        // Set default datetime to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setCallDateTime(now.toISOString().slice(0, 16));
        setInvestorId('');
        setOutcome('');
        setNotes('');
        setNextStep('');
        setCreateTask(false);
        setTaskTitle('');
        setTaskPriority('medium');
        setTaskDueDate('');
      }
    }
  }, [open, editingLog]);

  // Auto-generate task title when investor changes
  useEffect(() => {
    if (selectedInvestor && createTask && !taskTitle) {
      setTaskTitle(`Follow up with ${selectedInvestor.investor_name}`);
    }
  }, [selectedInvestor, createTask, taskTitle]);

  const handleSubmit = () => {
    if (!investorId || !callDateTime || !outcome) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSave({
      investor_id: investorId,
      call_datetime: new Date(callDateTime).toISOString(),
      outcome,
      notes: notes || null,
      next_step: nextStep || null,
      create_task: createTask,
      task_title: createTask ? (taskTitle || `Follow up with ${selectedInvestor?.investor_name}`) : null,
      task_priority: createTask ? taskPriority : null,
      task_due_date: createTask ? (taskDueDate || null) : null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#0047AB]" />
            {editingLog ? 'Edit Call Log' : 'Log Call'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Investor Selection (only for new logs) */}
          {!editingLog && (
            <div>
              <label className="text-sm text-[#94A3B8] mb-1.5 block">Investor *</label>
              <Select value={investorId} onValueChange={setInvestorId}>
                <SelectTrigger 
                  className="bg-[#02040A]/60 border-[#1A2744] text-white"
                  data-testid="call-log-investor-select"
                >
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-[200px]">
                  {investors.map(investor => (
                    <SelectItem 
                      key={investor.id} 
                      value={investor.id}
                      className="text-white focus:bg-[#0047AB]/20"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-[#0047AB] text-white text-[10px]">
                            {getInitials(investor.investor_name)}
                          </AvatarFallback>
                        </Avatar>
                        {investor.investor_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show investor name for edit mode */}
          {editingLog && (
            <div>
              <label className="text-sm text-[#94A3B8] mb-1.5 block">Investor</label>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#02040A]/60 border border-[#1A2744]">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-[#0047AB] text-white text-xs">
                    {getInitials(editingLog.investor_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white">{editingLog.investor_name}</span>
              </div>
            </div>
          )}

          {/* Call Date/Time */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Call Date & Time *</label>
            <Input
              type="datetime-local"
              value={callDateTime}
              onChange={(e) => setCallDateTime(e.target.value)}
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="call-log-datetime-input"
            />
          </div>

          {/* Outcome */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Outcome *</label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger 
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                data-testid="call-log-outcome-select"
              >
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                {Object.entries(OUTCOME_CONFIG).map(([key, config]) => (
                  <SelectItem 
                    key={key} 
                    value={key}
                    className="text-white focus:bg-[#0047AB]/20"
                  >
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.text}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter call notes..."
              className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[80px]"
              data-testid="call-log-notes-input"
            />
          </div>

          {/* Next Step */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Next Step</label>
            <Input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g., Send follow-up email, Schedule meeting..."
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="call-log-next-step-input"
            />
          </div>

          {/* Create Follow-up Task Toggle (only for new logs) */}
          {!editingLog && (
            <div className="pt-2">
              <div 
                className="rounded-lg p-4 border border-[#1A2744]"
                style={{ background: createTask ? 'rgba(0, 71, 171, 0.1)' : 'rgba(2, 4, 10, 0.4)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className={`h-4 w-4 ${createTask ? 'text-[#0047AB]' : 'text-[#94A3B8]'}`} />
                    <Label htmlFor="create-task" className="text-white font-medium cursor-pointer">
                      Create Follow-up Task
                    </Label>
                  </div>
                  <Switch
                    id="create-task"
                    checked={createTask}
                    onCheckedChange={setCreateTask}
                    data-testid="call-log-create-task-toggle"
                  />
                </div>
                
                {createTask && (
                  <div className="space-y-3 pt-3 border-t border-[#1A2744]">
                    {/* Task Title */}
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1 block">Task Title</label>
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder={`Follow up with ${selectedInvestor?.investor_name || 'Investor'}`}
                        className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
                        data-testid="call-log-task-title-input"
                      />
                    </div>
                    
                    {/* Task Priority */}
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1 block">Priority</label>
                      <Select value={taskPriority} onValueChange={setTaskPriority}>
                        <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm">
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
                    
                    {/* Task Due Date */}
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1 block">Due Date (Optional)</label>
                      <Input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
                        data-testid="call-log-task-due-date-input"
                      />
                    </div>
                  </div>
                )}
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
              disabled={!investorId || !callDateTime || !outcome || isSaving}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="call-log-save-btn"
            >
              {isSaving ? 'Saving...' : (editingLog ? 'Update' : 'Log Call')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Call Log Detail Sheet
const CallLogDetailSheet = ({ 
  open, 
  onOpenChange, 
  callLog, 
  onEdit, 
  onDelete 
}) => {
  if (!callLog) return null;

  const outcomeConfig = OUTCOME_CONFIG[callLog.outcome] || OUTCOME_CONFIG.connected;
  const OutcomeIcon = outcomeConfig.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#0A1628] border-l border-[#1A2744] w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#0047AB]" />
            Call Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Investor Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-[#0047AB] text-white">
                {getInitials(callLog.investor_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-semibold">{callLog.investor_name}</h3>
              <p className="text-[#94A3B8] text-sm">{formatDateTime(callLog.call_datetime)}</p>
            </div>
          </div>

          {/* Outcome Badge */}
          <div 
            className={`rounded-lg p-3 border ${outcomeConfig.border} ${outcomeConfig.bg}`}
          >
            <div className="flex items-center gap-2">
              <OutcomeIcon className={`h-5 w-5 ${outcomeConfig.text}`} />
              <span className={`font-medium ${outcomeConfig.text}`}>{outcomeConfig.label}</span>
            </div>
          </div>

          {/* Notes */}
          {callLog.notes && (
            <div>
              <h4 className="text-[#94A3B8] text-sm mb-2">Notes</h4>
              <p className="text-white text-sm whitespace-pre-wrap">{callLog.notes}</p>
            </div>
          )}

          {/* Next Step */}
          {callLog.next_step && (
            <div>
              <h4 className="text-[#94A3B8] text-sm mb-2">Next Step</h4>
              <div className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-[#0047AB] mt-0.5 flex-shrink-0" />
                <p className="text-white text-sm">{callLog.next_step}</p>
              </div>
            </div>
          )}

          {/* Task Created Badge */}
          {callLog.task_created && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20">
              <Check className="h-4 w-4 text-[#22C55E]" />
              <span className="text-[#22C55E] text-sm font-medium">Task created</span>
            </div>
          )}

          {/* Meta Info */}
          <div className="pt-4 border-t border-[#1A2744]">
            <p className="text-[#94A3B8] text-xs">
              Logged by {callLog.created_by_name || 'Unknown'} on {formatDate(callLog.created_at)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex-1 border-[#1A2744] text-white hover:bg-[#1A2744]"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={onDelete}
              className="border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Gmail Credential Setup — self-serve form (no .env editing required)
const GmailSetupForm = ({ token, API_URL, onSaved }) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:8000/api/gmail/callback');
  const [saving, setSaving] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Client ID and Client Secret are required');
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/gmail/credentials`,
        { client_id: clientId.trim(), client_secret: clientSecret.trim(), redirect_uri: redirectUri.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Credentials saved — now click Connect Gmail');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* How-to guide (collapsible) */}
      <div className="border border-[#1A2744] rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1A2744]/30 transition-colors"
          onClick={() => setGuideOpen(!guideOpen)}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-white font-medium text-sm">How to get your Google credentials (3 min)</span>
          </div>
          {guideOpen ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
        </button>

        {guideOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#1A2744]">
            <p className="text-[#94A3B8] text-xs mt-3">
              Do this once — you'll get a Client ID and Client Secret to paste into the form below.
            </p>
            {[
              {
                step: 1,
                title: 'Open Google Cloud Console',
                desc: 'Sign in and create a new project (or select an existing one).',
                link: 'https://console.cloud.google.com',
                linkLabel: 'console.cloud.google.com',
              },
              {
                step: 2,
                title: 'Enable the Gmail API',
                desc: 'APIs & Services → Library → search "Gmail API" → Enable.',
              },
              {
                step: 3,
                title: 'Create OAuth 2.0 Credentials',
                desc: 'APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Web Application.',
              },
              {
                step: 4,
                title: 'Add the Authorized Redirect URI',
                desc: 'Under "Authorized redirect URIs" paste this URL exactly as shown:',
                code: 'http://localhost:8000/api/gmail/callback',
              },
              {
                step: 5,
                title: 'Copy Client ID & Secret, then paste below',
                desc: 'Click Download or copy from the credentials panel, paste into the form below, and click Save.',
              },
            ].map(({ step, title, desc, code, link, linkLabel }) => (
              <div key={step} className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0047AB]/20 border border-[#0047AB]/40 flex items-center justify-center mt-0.5">
                  <span className="text-[#00A3FF] text-[9px] font-bold">{step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">{title}</p>
                  <p className="text-[#94A3B8] text-[11px] mt-0.5">{desc}</p>
                  {code && (
                    <pre className="mt-1 bg-[#02040A] border border-[#1A2744] rounded p-2 text-[#00A3FF] text-[10px] font-mono">
                      {code}
                    </pre>
                  )}
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-[#00A3FF] text-[11px] hover:underline">
                      <ExternalLink className="w-3 h-3" />{linkLabel}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credential input form */}
      <div className="border border-[#0047AB]/30 rounded-xl p-4 bg-[#0047AB]/5 space-y-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#0047AB]" />
          Paste Your Google Credentials
        </h3>
        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">Google Client ID *</label>
          <Input
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="123456789-abc...apps.googleusercontent.com"
            className="bg-[#02040A] border-[#1A2744] text-white text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">Google Client Secret *</label>
          <Input
            type="password"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            placeholder="GOCSPX-…"
            className="bg-[#02040A] border-[#1A2744] text-white text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">
            Redirect URI <span className="text-[#94A3B8]/60">(pre-filled — must match what you added in Google Console)</span>
          </label>
          <Input
            value={redirectUri}
            onChange={e => setRedirectUri(e.target.value)}
            className="bg-[#02040A] border-[#1A2744] text-[#94A3B8] text-sm font-mono"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !clientId.trim() || !clientSecret.trim()}
          className="w-full text-white"
          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
        >
          {saving ? 'Saving…' : 'Save Credentials & Continue →'}
        </Button>
      </div>
    </div>
  );
};

// Compose Email Dialog
const ComposeDialog = ({ open, onOpenChange, investors, gmailEmail, onSend }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [investorId, setInvestorId] = useState('');
  const [sending, setSending] = useState(false);

  // When investor is selected, auto-fill "to" from their contact email
  const handleInvestorChange = (id) => {
    setInvestorId(id);
    const inv = investors.find(i => i.id === id);
    if (inv?.contact_email) setTo(inv.contact_email);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) { toast.error('Fill in To, Subject, and Body'); return; }
    setSending(true);
    const inv = investors.find(i => i.id === investorId);
    await onSend({ to, subject, body, cc: cc || null, investor_id: investorId || null, investor_name: inv?.investor_name || null });
    setSending(false);
    onOpenChange(false);
    setTo(''); setSubject(''); setBody(''); setCc(''); setInvestorId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#0047AB]" />
            Compose Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Link to Investor (optional)</label>
            <Select value={investorId} onValueChange={handleInvestorChange}>
              <SelectTrigger className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm">
                <SelectValue placeholder="Select investor…" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-52">
                {investors.map(inv => (
                  <SelectItem key={inv.id} value={inv.id} className="text-white focus:bg-[#0047AB]/20 text-sm">
                    {inv.investor_name}{inv.contact_email ? ` · ${inv.contact_email}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">To *</label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">CC</label>
            <Input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com" className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Subject *</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Body *</label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message…" className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[140px] text-sm" />
          </div>
          {gmailEmail && (
            <p className="text-[#94A3B8] text-xs">Sending from: <span className="text-white">{gmailEmail}</span></p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[#94A3B8]">Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !to || !subject || !body} className="text-white" style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}>
              {sending ? 'Sending…' : <><Send className="h-4 w-4 mr-1.5" /> Send</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Email row in inbox list
const EmailRow = ({ email, onClick }) => {
  const fromDisplay = email.from.replace(/<.*>/, '').trim() || email.from;
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        email.is_read
          ? 'border-[#1A2744] hover:border-[#0047AB]/40'
          : 'border-[#0047AB]/30 bg-[#0047AB]/5 hover:border-[#0047AB]/60'
      }`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1A2744] flex items-center justify-center mt-0.5">
        {email.is_read ? <MailOpen className="w-4 h-4 text-[#94A3B8]" /> : <Mail className="w-4 h-4 text-[#00A3FF]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${email.is_read ? 'text-[#94A3B8]' : 'text-white font-medium'}`}>
            {fromDisplay}
          </p>
          <span className="text-[10px] text-[#94A3B8] flex-shrink-0">{email.date?.slice(0, 11)}</span>
        </div>
        <p className={`text-xs truncate ${email.is_read ? 'text-[#94A3B8]' : 'text-white'}`}>{email.subject}</p>
        <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">{email.snippet}</p>
        {email.linked_investor && (
          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-[#0047AB]/15 text-[#00A3FF]">
            <Link2 className="w-2.5 h-2.5" />
            {email.linked_investor.name}
          </span>
        )}
      </div>
    </div>
  );
};

// Inbox (Email) Sub-tab
const InboxTab = ({ fundId, fundName, token, API_URL, investors, gmailStatus, onGmailStatusChange }) => {
  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [showUpdateCreds, setShowUpdateCreds] = useState(false);

  const isConnected = gmailStatus?.connected;
  const hasCredentials = gmailStatus?.has_credentials;

  const fetchEmails = useCallback(async () => {
    if (!isConnected) return;
    setLoadingEmails(true);
    try {
      const res = await axios.get(`${API_URL}/api/gmail/messages?fund_id=${fundId}&limit=40`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmails(res.data.messages || []);
    } catch {
      toast.error('Failed to fetch emails');
    } finally {
      setLoadingEmails(false);
    }
  }, [isConnected, fundId, token, API_URL]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // Handle Gmail OAuth redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      toast.success('Gmail connected successfully!');
      onGmailStatusChange?.();
    } else if (params.get('gmail_error')) {
      window.history.replaceState({}, '', window.location.pathname);
      toast.error(`Gmail connection failed: ${params.get('gmail_error')}`);
    }
  }, []);

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await axios.get(`${API_URL}/api/gmail/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to get Gmail auth URL');
      setConnectingGmail(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.delete(`${API_URL}/api/gmail/disconnect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Gmail disconnected');
      onGmailStatusChange?.();
      setEmails([]);
    } catch {
      toast.error('Failed to disconnect Gmail');
    }
  };

  const handleSendEmail = async (data) => {
    try {
      await axios.post(`${API_URL}/api/gmail/send`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Email sent');
      fetchEmails();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
    }
  };

  const filteredEmails = emails.filter(e =>
    !search || e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.from?.toLowerCase().includes(search.toLowerCase()) ||
    e.snippet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Inbox Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1A2744]">
        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search emails…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 w-56 bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
              />
            </div>
          )}
          {isConnected && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20">
              <Wifi className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[#22C55E] text-xs font-medium">{gmailStatus.gmail_email}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEmails}
                className="border-[#1A2744] text-[#94A3B8] hover:bg-[#1A2744] text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCompose(true)}
                className="text-white text-xs"
                style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Compose
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="text-[#94A3B8] hover:text-[#EF4444] text-xs"
              >
                <WifiOff className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {/* Connect button in header only shown when creds saved but not yet authorized */}
          {!isConnected && hasCredentials && !showUpdateCreds && (
            <Button
              onClick={handleConnectGmail}
              disabled={connectingGmail}
              size="sm"
              className="text-white text-xs"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              {connectingGmail ? 'Redirecting…' : 'Connect Gmail'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step 1: No credentials saved yet → show setup form */}
        {!isConnected && !hasCredentials && (
          <GmailSetupForm token={token} API_URL={API_URL} onSaved={onGmailStatusChange} />
        )}

        {/* Step 2: Credentials saved but not connected → show Connect button + optional update */}
        {!isConnected && hasCredentials && !showUpdateCreds && (
          <div className="border border-[#1A2744] rounded-xl p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0047AB20 0%, #0052CC20 100%)' }}>
              <Mail className="w-7 h-7 text-[#0047AB]" />
            </div>
            <div>
              <p className="text-white font-semibold">Google credentials saved</p>
              <p className="text-[#94A3B8] text-sm mt-1">Click below to authorize access to your Gmail inbox.</p>
            </div>
            <Button
              onClick={handleConnectGmail}
              disabled={connectingGmail}
              className="text-white px-6"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
            >
              <Mail className="h-4 w-4 mr-2" />
              {connectingGmail ? 'Redirecting to Google…' : 'Connect Gmail →'}
            </Button>
            <button
              onClick={() => setShowUpdateCreds(true)}
              className="text-[#94A3B8] text-xs hover:text-white transition-colors"
            >
              Update credentials
            </button>
          </div>
        )}

        {/* Update credentials form (shown when toggled) */}
        {!isConnected && hasCredentials && showUpdateCreds && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-medium">Update Google Credentials</p>
              <button onClick={() => setShowUpdateCreds(false)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <GmailSetupForm token={token} API_URL={API_URL} onSaved={() => { setShowUpdateCreds(false); onGmailStatusChange?.(); }} />
          </div>
        )}

        {/* Connected: email list */}
        {isConnected && (
          loadingEmails ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-5 h-5 text-[#94A3B8] animate-spin mr-2" />
              <span className="text-[#94A3B8] text-sm">Fetching emails…</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title={search ? 'No matching emails' : 'No emails yet'}
              description={search ? 'Try a different search term.' : 'Emails from investors will appear here, automatically linked by email address.'}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-[#94A3B8] text-xs px-1">{filteredEmails.length} emails • investor-linked emails are tagged</p>
              {filteredEmails.map(email => (
                <EmailRow key={email.id} email={email} onClick={() => {}} />
              ))}
            </div>
          )
        )}
      </div>

      <ComposeDialog
        open={showCompose}
        onOpenChange={setShowCompose}
        investors={investors}
        gmailEmail={gmailStatus?.gmail_email}
        onSend={handleSendEmail}
      />
    </div>
  );
};

// Call Logs Sub-tab
const CallLogsTab = ({ fundId, fundName, token, API_URL, investors }) => {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filters
  const [filterInvestor, setFilterInvestor] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchCallLogs = useCallback(async () => {
    if (!fundId) return;
    
    setLoading(true);
    try {
      let url = `${API_URL}/api/funds/${fundId}/call-logs`;
      const params = new URLSearchParams();
      
      if (filterInvestor && filterInvestor !== 'all') {
        params.append('investor_id', filterInvestor);
      }
      if (filterStartDate) {
        params.append('start_date', filterStartDate);
      }
      if (filterEndDate) {
        params.append('end_date', filterEndDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCallLogs(response.data.call_logs || []);
    } catch (error) {
      console.error('Failed to fetch call logs:', error);
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  }, [fundId, token, API_URL, filterInvestor, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  const handleSaveCallLog = async (data) => {
    setIsSaving(true);
    try {
      if (editingLog) {
        // Update existing
        await axios.put(
          `${API_URL}/api/call-logs/${editingLog.id}`,
          {
            call_datetime: data.call_datetime,
            outcome: data.outcome,
            notes: data.notes,
            next_step: data.next_step
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Call log updated');
      } else {
        // Create new
        const response = await axios.post(
          `${API_URL}/api/funds/${fundId}/call-logs`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.task_created) {
          toast.success('Call logged and follow-up task created');
        } else {
          toast.success('Call logged');
        }
      }
      setShowCreateDialog(false);
      setEditingLog(null);
      fetchCallLogs();
    } catch (error) {
      console.error('Failed to save call log:', error);
      toast.error('Failed to save call log');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCallLog = async () => {
    if (!selectedLog) return;
    
    try {
      await axios.delete(
        `${API_URL}/api/call-logs/${selectedLog.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Call log deleted');
      setShowDetailSheet(false);
      setSelectedLog(null);
      fetchCallLogs();
    } catch (error) {
      console.error('Failed to delete call log:', error);
      toast.error('Failed to delete call log');
    }
  };

  const handleEditFromDetail = () => {
    setShowDetailSheet(false);
    setEditingLog(selectedLog);
    setShowCreateDialog(true);
  };

  const clearFilters = () => {
    setFilterInvestor('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasFilters = filterInvestor !== 'all' || filterStartDate || filterEndDate;

  return (
    <div className="h-full flex flex-col">
      {/* Call Logs Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1A2744]">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Investor Filter */}
          <Select value={filterInvestor} onValueChange={setFilterInvestor}>
            <SelectTrigger className="w-[180px] bg-[#02040A]/60 border-[#1A2744] text-white text-sm">
              <User className="h-4 w-4 mr-2 text-[#94A3B8]" />
              <SelectValue placeholder="All Investors" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-[200px]">
              <SelectItem value="all" className="text-white focus:bg-[#0047AB]/20">
                All Investors
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

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              placeholder="Start date"
              className="w-[140px] bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
              data-testid="calls-filter-start-date"
            />
            <span className="text-[#94A3B8]">to</span>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              placeholder="End date"
              className="w-[140px] bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
              data-testid="calls-filter-end-date"
            />
          </div>

          {hasFilters && (
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
        
        <Button
          onClick={() => {
            setEditingLog(null);
            setShowCreateDialog(true);
          }}
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
          data-testid="log-call-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Call
        </Button>
      </div>

      {/* Call Logs Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0047AB]"></div>
        </div>
      ) : callLogs.length === 0 ? (
        <EmptyState
          icon={Phone}
          title={hasFilters ? "No matching call logs" : "No call logs yet"}
          description={hasFilters 
            ? "Try adjusting your filters to find call logs."
            : `Track all investor calls for ${fundName}. Log call outcomes, notes, and follow-up actions in one place.`
          }
          actionLabel={hasFilters ? null : "Log First Call"}
          onAction={hasFilters ? null : () => {
            setEditingLog(null);
            setShowCreateDialog(true);
          }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {callLogs.map((log) => {
              const outcomeConfig = OUTCOME_CONFIG[log.outcome] || OUTCOME_CONFIG.connected;
              const OutcomeIcon = outcomeConfig.icon;
              
              return (
                <div
                  key={log.id}
                  onClick={() => {
                    setSelectedLog(log);
                    setShowDetailSheet(true);
                  }}
                  className={`rounded-lg p-4 border border-[#1A2744] hover:border-[#0047AB]/50 cursor-pointer transition-colors`}
                  style={{ background: 'rgba(2, 4, 10, 0.4)' }}
                  data-testid={`call-log-${log.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#0047AB] text-white">
                          {getInitials(log.investor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{log.investor_name}</h3>
                          {log.task_created && (
                            <span className="flex items-center gap-1 text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded">
                              <Check className="h-3 w-3" />
                              Task created
                            </span>
                          )}
                        </div>
                        <p className="text-[#94A3B8] text-sm">{formatDateTime(log.call_datetime)}</p>
                        {log.notes && (
                          <p className="text-[#94A3B8] text-sm mt-1 line-clamp-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Outcome Badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${outcomeConfig.bg}`}>
                      <OutcomeIcon className={`h-3.5 w-3.5 ${outcomeConfig.text}`} />
                      <span className={`text-xs font-medium ${outcomeConfig.text}`}>
                        {outcomeConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CallLogDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setEditingLog(null);
        }}
        investors={investors}
        onSave={handleSaveCallLog}
        editingLog={editingLog}
        isSaving={isSaving}
      />

      {/* Detail Sheet */}
      <CallLogDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        callLog={selectedLog}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteCallLog}
      />
    </div>
  );
};

const TEMPLATE_CATEGORIES = ['General', 'Introduction', 'Follow-up', 'Meeting Request', 'Thank You', 'Capital Call', 'Update'];

// Template Form (create/edit)
const TemplateForm = ({ initial, onSave, onCancel, loading }) => {
  const [name, setName] = useState(initial?.name || '');
  const [subject, setSubject] = useState(initial?.subject || '');
  const [body, setBody] = useState(initial?.body || '');
  const [category, setCategory] = useState(initial?.category || 'General');

  const handleSave = () => {
    if (!name || !subject || !body) { toast.error('Name, Subject, and Body are required'); return; }
    onSave({ name, subject, body, category });
  };

  return (
    <div className="border border-[#1A2744] rounded-xl p-4 bg-[#02040A]/60 space-y-3">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#0047AB]" />
        {initial ? 'Edit Template' : 'New Template'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">Template Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Intro Email Template" className="bg-[#0A1628] border-[#1A2744] text-white text-sm" />
        </div>
        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-[#0A1628] border-[#1A2744] text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744]">
              {TEMPLATE_CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="text-white focus:bg-[#0047AB]/20 text-sm">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#94A3B8] mb-1 block">Subject *</label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" className="bg-[#0A1628] border-[#1A2744] text-white text-sm" />
      </div>

      <div>
        <label className="text-xs text-[#94A3B8] mb-1 block">
          Body * — available variables:
          <span className="ml-2 text-[#00A3FF] font-mono text-[10px]">{'{{investor_name}} {{fund_name}} {{sender_name}}'}</span>
        </label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Dear {{investor_name}},&#10;&#10;I hope this message finds you well…" className="bg-[#0A1628] border-[#1A2744] text-white min-h-[160px] text-sm font-mono" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} className="text-[#94A3B8] text-sm">Cancel</Button>
        <Button onClick={handleSave} disabled={loading} className="text-white text-sm" style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}>
          {loading ? 'Saving…' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
};

// Template card
const TemplateCard = ({ template, onEdit, onDelete, onPreview }) => (
  <div className="border border-[#1A2744] rounded-xl p-4 bg-[#02040A]/40 hover:border-[#0047AB]/40 transition-colors">
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium text-sm truncate">{template.name}</p>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1A2744] text-[#94A3B8]">{template.category}</span>
        </div>
        <p className="text-[#94A3B8] text-xs mt-0.5 truncate">{template.subject}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onPreview(template)} className="p-1.5 rounded hover:bg-[#1A2744] text-[#94A3B8] hover:text-white transition-colors">
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onEdit(template)} className="p-1.5 rounded hover:bg-[#1A2744] text-[#94A3B8] hover:text-white transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(template)} className="p-1.5 rounded hover:bg-[#EF4444]/10 text-[#94A3B8] hover:text-[#EF4444] transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <p className="text-[#94A3B8] text-xs line-clamp-2 mt-1">{template.body}</p>
  </div>
);

// Template Preview Dialog
const TemplatePreview = ({ open, onOpenChange, template }) => {
  if (!template) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.body}`);
    toast.success('Copied to clipboard');
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#0047AB]" />
            {template.name}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs bg-[#1A2744] text-[#94A3B8]">{template.category}</span>
          </div>
          <div className="bg-[#02040A] border border-[#1A2744] rounded-lg p-3">
            <p className="text-[#94A3B8] text-xs mb-0.5">Subject</p>
            <p className="text-white text-sm">{template.subject}</p>
          </div>
          <div className="bg-[#02040A] border border-[#1A2744] rounded-lg p-3">
            <p className="text-[#94A3B8] text-xs mb-1.5">Body</p>
            <pre className="text-white text-sm whitespace-pre-wrap font-sans leading-relaxed">{template.body}</pre>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCopy} variant="outline" size="sm" className="border-[#1A2744] text-[#94A3B8] hover:bg-[#1A2744] text-xs">
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy to Clipboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Templates Sub-tab
const TemplatesTab = ({ fundId, fundName, token, API_URL }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/funds/${fundId}/email-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(res.data.templates || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [fundId, token, API_URL]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      await axios.post(`${API_URL}/api/funds/${fundId}/email-templates`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Template created');
      setShowForm(false);
      fetchTemplates();
    } catch {
      toast.error('Failed to create template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    setFormLoading(true);
    try {
      await axios.put(`${API_URL}/api/email-templates/${editingTemplate.id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Template updated');
      setEditingTemplate(null);
      fetchTemplates();
    } catch {
      toast.error('Failed to update template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete "${template.name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/email-templates/${template.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  // Count per category
  const categoryCounts = TEMPLATE_CATEGORIES.reduce((acc, c) => {
    acc[c] = templates.filter(t => t.category === c).length;
    return acc;
  }, {});

  const filtered = templates.filter(t =>
    (filterCategory === 'All' || t.category === filterCategory) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1A2744]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 w-56 bg-[#02040A]/60 border-[#1A2744] text-white text-sm"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] bg-[#02040A]/60 border-[#1A2744] text-white text-sm">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-[#94A3B8]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#1A2744]">
              <SelectItem value="All" className="text-white focus:bg-[#0047AB]/20 text-sm">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="text-white focus:bg-[#0047AB]/20 text-sm">
                  {c} {categoryCounts[c] > 0 ? `(${categoryCounts[c]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => { setShowForm(true); setEditingTemplate(null); }}
          className="text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Template
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Form */}
        {(showForm || editingTemplate) && (
          <TemplateForm
            initial={editingTemplate}
            onSave={editingTemplate ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
            loading={formLoading}
          />
        )}

        {/* Category quick-filter chips */}
        {!showForm && !editingTemplate && templates.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {['All', ...TEMPLATE_CATEGORIES.filter(c => categoryCounts[c] > 0)].map(c => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === c
                    ? 'bg-[#0047AB] text-white'
                    : 'bg-[#1A2744] text-[#94A3B8] hover:text-white'
                }`}
              >
                {c} {c !== 'All' && categoryCounts[c] > 0 ? `· ${categoryCounts[c]}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Templates grid or states */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 text-[#94A3B8] animate-spin mr-2" />
            <span className="text-[#94A3B8] text-sm">Loading templates…</span>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description={`Create reusable email templates for ${fundName}. Use variables like {{investor_name}} to personalize each email.`}
            actionLabel="Create First Template"
            onAction={() => setShowForm(true)}
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[#94A3B8] text-sm">No templates match your search.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={tmpl => { setEditingTemplate(tmpl); setShowForm(false); }}
                onDelete={handleDelete}
                onPreview={tmpl => setPreviewTemplate(tmpl)}
              />
            ))}
          </div>
        )}
      </div>

      <TemplatePreview
        open={!!previewTemplate}
        onOpenChange={open => !open && setPreviewTemplate(null)}
        template={previewTemplate}
      />
    </div>
  );
};

export const CommunicationCenter = ({
  fundId,
  fundName,
  token,
  API_URL,
  investors = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState('inbox');
  const [gmailStatus, setGmailStatus] = useState(null);

  const fetchGmailStatus = useCallback(async () => {
    if (!token || !API_URL) return;
    try {
      const res = await axios.get(`${API_URL}/api/gmail/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGmailStatus(res.data);
    } catch {
      setGmailStatus({ connected: false, gmail_email: null, configured: false });
    }
  }, [token, API_URL]);

  useEffect(() => { fetchGmailStatus(); }, [fetchGmailStatus]);

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="communication-center">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white mb-1">Communication Center</h1>
        <p className="text-[#94A3B8]">{fundName} • Manage investor communications</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1 flex flex-col">
          <TabsList className="bg-[#02040A]/60 border border-[#1A2744] p-1 rounded-lg w-fit mb-4">
            <TabsTrigger
              value="inbox"
              className="data-[state=active]:bg-[#0047AB] data-[state=active]:text-white text-[#94A3B8] rounded-md px-4 py-2 flex items-center gap-2"
              data-testid="subtab-inbox"
            >
              <Mail className="h-4 w-4" />
              Inbox
              {gmailStatus?.connected && (
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="calls"
              className="data-[state=active]:bg-[#0047AB] data-[state=active]:text-white text-[#94A3B8] rounded-md px-4 py-2 flex items-center gap-2"
              data-testid="subtab-calls"
            >
              <Phone className="h-4 w-4" />
              Call Logs
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-[#0047AB] data-[state=active]:text-white text-[#94A3B8] rounded-md px-4 py-2 flex items-center gap-2"
              data-testid="subtab-templates"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Sub-tab Content */}
          <div
            className="flex-1 rounded-xl border border-[#1A2744] overflow-hidden"
            style={{ background: 'rgba(2, 4, 10, 0.4)' }}
          >
            <TabsContent value="inbox" className="h-full mt-0">
              <InboxTab
                fundId={fundId}
                fundName={fundName}
                token={token}
                API_URL={API_URL}
                investors={investors}
                gmailStatus={gmailStatus}
                onGmailStatusChange={fetchGmailStatus}
              />
            </TabsContent>

            <TabsContent value="calls" className="h-full mt-0">
              <CallLogsTab
                fundId={fundId}
                fundName={fundName}
                token={token}
                API_URL={API_URL}
                investors={investors}
              />
            </TabsContent>

            <TabsContent value="templates" className="h-full mt-0">
              <TemplatesTab
                fundId={fundId}
                fundName={fundName}
                token={token}
                API_URL={API_URL}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
