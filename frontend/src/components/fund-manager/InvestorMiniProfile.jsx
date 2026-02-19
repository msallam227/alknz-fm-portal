import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Globe, 
  Phone, 
  Mail, 
  MessageCircle, 
  DollarSign, 
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  Send,
  Briefcase,
  MapPin,
  GitBranch,
  CheckCircle,
  XCircle,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import axios from 'axios';
import { getInitials, formatCurrency } from './constants';

// Stage colors for display
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

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateString);
};

export const InvestorMiniProfile = ({
  investor,
  open,
  onOpenChange,
  teamMembers,
  token,
  API_URL,
  onViewFullProfile
}) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Get team member name
  const getTeamMemberName = (userId) => {
    const member = teamMembers?.find(m => m.id === userId);
    return member ? `${member.first_name} ${member.last_name}` : null;
  };

  // Fetch notes when investor changes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!investor) return;
      setLoadingNotes(true);
      try {
        const res = await axios.get(
          `${API_URL}/api/investor-notes/${investor.id}?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotes(res.data);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      } finally {
        setLoadingNotes(false);
      }
    };

    if (investor && open) {
      fetchNotes();
    }
  }, [investor, open, API_URL, token]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setSavingNote(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/investor-notes`,
        { investor_id: investor.id, content: newNote.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes([res.data, ...notes.slice(0, 4)]);
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(
        `${API_URL}/api/investor-notes/${noteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(notes.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  if (!investor) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[480px] bg-[#0A1628] border-l border-[#1A2744] p-0 overflow-hidden"
        data-testid="mini-profile-sheet"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A1628] border-b border-[#1A2744] p-4">
          <SheetHeader className="space-y-0">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarFallback className="bg-[#0047AB] text-white text-lg">
                  {getInitials(investor.investor_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-white text-lg font-semibold truncate pr-8">
                  {investor.investor_name}
                </SheetTitle>
                <SheetDescription className="text-[#94A3B8] text-sm mt-0.5">
                  {investor.investor_type || 'Individual'}
                  {investor.sector && ` • ${investor.sector}`}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          {/* View Full Profile Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onViewFullProfile(investor);
              onOpenChange(false);
            }}
            className="w-full mt-3 bg-transparent border-[#1A2744] text-[#00A3FF] hover:bg-[#0047AB]/20 hover:text-white"
            data-testid="view-full-profile-btn"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(100vh-160px)] p-4 space-y-4">
          
          {/* Quick Identity Section */}
          <div className="rounded-lg border border-[#1A2744] p-4" style={{ background: 'rgba(2, 4, 10, 0.5)' }}>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#00A3FF]" />
              Quick Identity
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Type</span>
                <span className="text-white">{investor.investor_type || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Sector</span>
                <span className="text-white">{investor.sector || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </span>
                <span className="text-white">
                  {investor.city || investor.country 
                    ? `${investor.city || ''}${investor.city && investor.country ? ', ' : ''}${investor.country || ''}`
                    : '-'}
                </span>
              </div>
              {investor.website && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </span>
                  <a 
                    href={investor.website.startsWith('http') ? investor.website : `https://${investor.website}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#00A3FF] hover:underline truncate max-w-[180px]"
                  >
                    {investor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Relationship Section */}
          <div className="rounded-lg border border-[#1A2744] p-4" style={{ background: 'rgba(2, 4, 10, 0.5)' }}>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#00A3FF]" />
              Contact & Relationship
            </h3>
            <div className="space-y-2 text-sm">
              {investor.contact_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">POC Name</span>
                  <span className="text-white">{investor.contact_name}</span>
                </div>
              )}
              {investor.contact_title && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">POC Title</span>
                  <span className="text-white">{investor.contact_title}</span>
                </div>
              )}
              {investor.contact_email && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </span>
                  <a 
                    href={`mailto:${investor.contact_email}`} 
                    className="text-[#00A3FF] hover:underline truncate max-w-[180px]"
                  >
                    {investor.contact_email}
                  </a>
                </div>
              )}
              {investor.contact_phone && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </span>
                  <a 
                    href={`tel:${investor.contact_phone}`} 
                    className="text-[#00A3FF] hover:underline"
                  >
                    {investor.contact_phone}
                  </a>
                </div>
              )}
              {investor.contact_whatsapp && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </span>
                  <a 
                    href={`https://wa.me/${investor.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#25D366] hover:underline"
                  >
                    {investor.contact_whatsapp}
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-[#1A2744]">
                <span className="text-[#94A3B8]">ALKNZ POC</span>
                <span className="text-[#00A3FF]">
                  {investor.alknz_point_of_contact_id 
                    ? getTeamMemberName(investor.alknz_point_of_contact_id) || 'Assigned'
                    : '-'}
                </span>
              </div>
              
              {/* Relationship Intelligence */}
              <div className="pt-2 mt-2 border-t border-[#1A2744] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Relationship</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    investor.relationship_strength === 'cold' ? 'bg-[#94A3B8]/10 text-[#94A3B8]' :
                    investor.relationship_strength === 'warm' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                    investor.relationship_strength === 'direct' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                    'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}>
                    {investor.relationship_strength === 'cold' ? 'Cold' :
                     investor.relationship_strength === 'warm' ? 'Warm' :
                     investor.relationship_strength === 'direct' ? 'Direct' :
                     'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Decision Role</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    investor.decision_role === 'decision_maker' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                    investor.decision_role === 'influencer' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                    investor.decision_role === 'gatekeeper' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                    'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}>
                    {investor.decision_role === 'decision_maker' ? 'Decision Maker' :
                     investor.decision_role === 'influencer' ? 'Influencer' :
                     investor.decision_role === 'gatekeeper' ? 'Gatekeeper' :
                     'Unknown'}
                  </span>
                </div>
                {investor.preferred_intro_path && (
                  <div className="flex items-start justify-between">
                    <span className="text-[#94A3B8]">Intro Path</span>
                    <span className="text-white text-right max-w-[180px]">{investor.preferred_intro_path}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Investment Context Section */}
          <div className="rounded-lg border border-[#1A2744] p-4" style={{ background: 'rgba(2, 4, 10, 0.5)' }}>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#00A3FF]" />
              Investment Context
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Prior ALKNZ Investment</span>
                <span className={investor.has_invested_with_alknz === true ? 'text-[#22C55E] flex items-center gap-1' : 'text-[#94A3B8] flex items-center gap-1'}>
                  {investor.has_invested_with_alknz === true ? (
                    <><CheckCircle className="h-3 w-3" /> Yes</>
                  ) : investor.has_invested_with_alknz === false ? (
                    <><XCircle className="h-3 w-3" /> No</>
                  ) : '-'}
                </span>
              </div>
              {investor.previous_alknz_funds?.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Previous Fund/SPV</span>
                  <span className="text-white text-right max-w-[180px] truncate">
                    {investor.previous_alknz_funds.join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Expected Ticket
                </span>
                <span className="text-[#22C55E] font-medium">
                  {formatCurrency(investor.expected_ticket_amount, investor.expected_ticket_currency)}
                </span>
              </div>
              {investor.typical_ticket_size && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Typical Ticket</span>
                  <span className="text-white">
                    {formatCurrency(investor.typical_ticket_size, investor.expected_ticket_currency || 'USD')}
                  </span>
                </div>
              )}
              {investor.wealth && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Wealth</span>
                  <span className="text-white">{investor.wealth}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Context Section */}
          <div className="rounded-lg border border-[#1A2744] p-4" style={{ background: 'rgba(2, 4, 10, 0.5)' }}>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[#00A3FF]" />
              Pipeline Context
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Current Stage</span>
                {investor.pipeline_stage_name ? (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStageColor(investor.pipeline_stage_name)}`}>
                    {investor.pipeline_stage_name}
                  </span>
                ) : (
                  <span className="text-[#94A3B8]">Not in Pipeline</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Stage Entered
                </span>
                <span className="text-white">
                  {formatDate(investor.pipeline_stage_entered_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last Interaction
                </span>
                <span className="text-white">
                  {formatRelativeTime(investor.pipeline_last_interaction_date)}
                </span>
              </div>
              {investor.pipeline_next_step && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Next Step</span>
                  <span className="text-[#F59E0B]">{investor.pipeline_next_step}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="rounded-lg border border-[#1A2744] p-4" style={{ background: 'rgba(2, 4, 10, 0.5)' }}>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#00A3FF]" />
              Notes
            </h3>
            
            {/* Add Note Form */}
            <div className="mb-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a quick note..."
                className="bg-[#02040A]/60 border-[#1A2744] text-white text-sm min-h-[60px] resize-none"
                data-testid="mini-profile-note-input"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || savingNote}
                className="mt-2 w-full text-white"
                style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
                data-testid="mini-profile-add-note-btn"
              >
                <Send className="h-3 w-3 mr-2" />
                {savingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
            
            {/* Notes Timeline */}
            {loadingNotes ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#0047AB] mx-auto"></div>
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {notes.map((note, index) => (
                  <div 
                    key={note.id} 
                    className={`text-sm ${index < notes.length - 1 ? 'border-b border-[#1A2744] pb-3' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00A3FF] text-xs font-medium">
                        {note.created_by_name || 'Team Member'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#475569] text-xs">
                          {formatRelativeTime(note.created_at)}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-[#475569] hover:text-[#EF4444] transition-colors"
                          data-testid={`delete-note-${note.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[#94A3B8] whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#475569] text-sm text-center py-4">No notes yet</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
