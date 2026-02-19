import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Link2,
  Plus,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Edit2,
  Trash2,
  Calendar,
  User,
  ExternalLink,
  Shield,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import axios from 'axios';
import { toast } from 'sonner';

// Confidence level config
const CONFIDENCE_CONFIG = {
  low: {
    label: 'Low',
    bg: 'bg-[#94A3B8]/10',
    text: 'text-[#94A3B8]',
    border: 'border-[#94A3B8]',
    icon: AlertCircle
  },
  medium: {
    label: 'Medium',
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]',
    icon: Shield
  },
  high: {
    label: 'High',
    bg: 'bg-[#3B82F6]/10',
    text: 'text-[#3B82F6]',
    border: 'border-[#3B82F6]',
    icon: Shield
  },
  verified: {
    label: 'Verified',
    bg: 'bg-[#22C55E]/10',
    text: 'text-[#22C55E]',
    border: 'border-[#22C55E]',
    icon: Check
  }
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Truncate text
const truncateText = (text, maxLength = 150) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Evidence Entry Dialog
const EvidenceDialog = ({
  open,
  onOpenChange,
  onSave,
  editingEntry = null,
  isSaving
}) => {
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState('medium');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setSourceTitle(editingEntry.source_title || '');
        setSourceUrl(editingEntry.source_url || '');
        setSelectedText(editingEntry.selected_text || '');
        setNotes(editingEntry.notes || '');
        setConfidence(editingEntry.confidence || 'medium');
      } else {
        setSourceTitle('');
        setSourceUrl('');
        setSelectedText('');
        setNotes('');
        setConfidence('medium');
      }
    }
  }, [open, editingEntry]);

  const handleSubmit = () => {
    if (!sourceTitle.trim()) {
      toast.error('Source title is required');
      return;
    }

    onSave({
      source_title: sourceTitle.trim(),
      source_url: sourceUrl.trim() || null,
      selected_text: selectedText.trim() || null,
      notes: notes.trim() || null,
      confidence
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border-[#1A2744] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0047AB]" />
            {editingEntry ? 'Edit Evidence' : 'Add Evidence'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Source Title */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Source Title *</label>
            <Input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="e.g., LinkedIn Profile, Company Website, News Article"
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="evidence-source-title-input"
            />
          </div>

          {/* Source URL */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Source URL</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="bg-[#02040A]/60 border-[#1A2744] text-white"
              data-testid="evidence-source-url-input"
            />
          </div>

          {/* Selected Text */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Selected Text</label>
            <Textarea
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="Paste the relevant text from the source..."
              className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[100px]"
              data-testid="evidence-selected-text-input"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your interpretation or additional context..."
              className="bg-[#02040A]/60 border-[#1A2744] text-white min-h-[80px]"
              data-testid="evidence-notes-input"
            />
          </div>

          {/* Confidence */}
          <div>
            <label className="text-sm text-[#94A3B8] mb-1.5 block">Confidence Level</label>
            <Select value={confidence} onValueChange={setConfidence}>
              <SelectTrigger 
                className="bg-[#02040A]/60 border-[#1A2744] text-white"
                data-testid="evidence-confidence-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1628] border-[#1A2744]">
                {Object.entries(CONFIDENCE_CONFIG).map(([key, config]) => (
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

          {/* Show captured info for editing */}
          {editingEntry && (
            <div className="pt-2 border-t border-[#1A2744]">
              <p className="text-xs text-[#94A3B8]">
                Originally captured by {editingEntry.captured_by_name || 'Unknown'} on {formatDate(editingEntry.captured_date)}
              </p>
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
              disabled={!sourceTitle.trim() || isSaving}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="evidence-save-btn"
            >
              {isSaving ? 'Saving...' : (editingEntry ? 'Update' : 'Add Evidence')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Evidence Entry Row Component
const EvidenceEntryRow = ({
  entry,
  onEdit,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const confidenceConfig = CONFIDENCE_CONFIG[entry.confidence] || CONFIDENCE_CONFIG.medium;
  const ConfidenceIcon = confidenceConfig.icon;

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (entry.source_url) {
      navigator.clipboard.writeText(entry.source_url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasExpandableContent = entry.selected_text || entry.notes;

  return (
    <div
      className="rounded-lg border border-[#1A2744] overflow-hidden"
      style={{ background: 'rgba(2, 4, 10, 0.4)' }}
      data-testid={`evidence-entry-${entry.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-[#1A2744]/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Expand/Collapse Icon */}
                {hasExpandableContent ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#94A3B8] mt-1 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#94A3B8] mt-1 flex-shrink-0" />
                  )
                ) : (
                  <div className="w-4" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-medium">{entry.source_title}</h4>
                    
                    {/* Confidence Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${confidenceConfig.bg} ${confidenceConfig.text}`}>
                      <ConfidenceIcon className="h-3 w-3" />
                      {confidenceConfig.label}
                    </span>
                  </div>
                  
                  {/* URL Preview */}
                  {entry.source_url && (
                    <div className="flex items-center gap-1 mt-1">
                      <Link2 className="h-3 w-3 text-[#0047AB]" />
                      <a 
                        href={entry.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#0047AB] hover:underline truncate max-w-[300px]"
                      >
                        {entry.source_url}
                      </a>
                    </div>
                  )}

                  {/* Preview of selected text (collapsed) */}
                  {!isExpanded && entry.selected_text && (
                    <p className="text-[#94A3B8] text-sm mt-2 line-clamp-2">
                      "{truncateText(entry.selected_text, 120)}"
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.captured_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {entry.captured_by_name || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {entry.source_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="text-[#94A3B8] hover:text-white h-8 w-8 p-0"
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[#22C55E]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {entry.source_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(entry.source_url, '_blank');
                    }}
                    className="text-[#94A3B8] hover:text-white h-8 w-8 p-0"
                    title="Open link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(entry);
                  }}
                  className="text-[#94A3B8] hover:text-white h-8 w-8 p-0"
                  title="Edit"
                  data-testid={`evidence-edit-${entry.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry);
                  }}
                  className="text-[#EF4444] hover:bg-[#EF4444]/10 h-8 w-8 p-0"
                  title="Delete"
                  data-testid={`evidence-delete-${entry.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {hasExpandableContent && (
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-[#1A2744] mt-0">
              <div className="pt-4 space-y-4 ml-7">
                {/* Full Selected Text */}
                {entry.selected_text && (
                  <div>
                    <h5 className="text-xs font-medium text-[#94A3B8] mb-2">Selected Text</h5>
                    <div className="p-3 rounded-lg bg-[#02040A]/60 border-l-2 border-[#0047AB]">
                      <p className="text-white text-sm whitespace-pre-wrap">{entry.selected_text}</p>
                    </div>
                  </div>
                )}

                {/* Full Notes */}
                {entry.notes && (
                  <div>
                    <h5 className="text-xs font-medium text-[#94A3B8] mb-2">Notes</h5>
                    <p className="text-[#94A3B8] text-sm whitespace-pre-wrap">{entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

// Main Evidence Block Component
export const EvidenceBlock = ({
  investorId,
  investorName,
  token,
  API_URL
}) => {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEvidence = useCallback(async () => {
    if (!investorId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/investors/${investorId}/evidence`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvidence(response.data.evidence || []);
    } catch (error) {
      console.error('Failed to fetch evidence:', error);
      // Don't show error toast on initial load - might just be empty
    } finally {
      setLoading(false);
    }
  }, [investorId, token, API_URL]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      if (editingEntry) {
        await axios.put(
          `${API_URL}/api/evidence/${editingEntry.id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Evidence updated');
      } else {
        await axios.post(
          `${API_URL}/api/investors/${investorId}/evidence`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Evidence added');
      }
      setShowDialog(false);
      setEditingEntry(null);
      fetchEvidence();
    } catch (error) {
      console.error('Failed to save evidence:', error);
      toast.error('Failed to save evidence');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowDialog(true);
  };

  const handleDelete = async (entry) => {
    if (!confirm('Are you sure you want to delete this evidence entry?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/api/evidence/${entry.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Evidence deleted');
      fetchEvidence();
    } catch (error) {
      console.error('Failed to delete evidence:', error);
      toast.error('Failed to delete evidence');
    }
  };

  return (
    <div 
      className="rounded-xl border border-[#1A2744] overflow-hidden"
      style={{ background: 'rgba(2, 4, 10, 0.4)' }}
      data-testid="evidence-block"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1A2744]">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#0047AB]" />
          <h3 className="text-white font-semibold">Evidence & Sources</h3>
          {evidence.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#0047AB]/20 text-[#0047AB]">
              {evidence.length}
            </span>
          )}
        </div>
        <Button
          onClick={() => {
            setEditingEntry(null);
            setShowDialog(true);
          }}
          size="sm"
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
          data-testid="add-evidence-btn"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Evidence
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#0047AB]"></div>
          </div>
        ) : evidence.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-[#475569] mx-auto mb-3" />
            <p className="text-[#94A3B8] text-sm mb-1">No evidence entries yet</p>
            <p className="text-[#64748B] text-xs">Add sources and evidence to support investor information</p>
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.map((entry) => (
              <EvidenceEntryRow
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <EvidenceDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingEntry(null);
        }}
        onSave={handleSave}
        editingEntry={editingEntry}
        isSaving={isSaving}
      />
    </div>
  );
};
