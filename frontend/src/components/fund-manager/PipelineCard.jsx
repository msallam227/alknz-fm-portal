import React from 'react';
import { User, MapPin, DollarSign, Briefcase } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, formatCurrency } from './constants';

export const PipelineCard = ({ investor, teamMembers, onClick, compact = false }) => {
  const getTeamMemberName = (userId) => {
    const member = teamMembers?.find(m => m.id === userId);
    return member ? `${member.first_name} ${member.last_name}` : null;
  };

  if (compact) {
    // Compact card for fixed-width columns
    return (
      <div
        onClick={onClick}
        className="bg-[#0A1628] border border-[#1A2744] rounded-md p-2 cursor-pointer hover:border-[#0047AB] transition-all group hover:shadow-lg"
      >
        {/* Header with Name */}
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarFallback className="bg-[#002D72] text-white text-[10px]">
              {getInitials(investor.investor_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-xs truncate group-hover:text-[#00A3FF] transition-colors">
              {investor.investor_name}
            </p>
          </div>
        </div>

        {/* Compact Details */}
        <div className="space-y-0.5 text-[10px]">
          <p className="text-[#94A3B8] truncate">
            {investor.investor_type || 'Individual'}
            {investor.sector && ` • ${investor.sector}`}
          </p>
          
          {(investor.city || investor.country) && (
            <div className="flex items-center gap-1 text-[#94A3B8]">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">
                {investor.city && investor.country 
                  ? `${investor.city}, ${investor.country}`
                  : investor.city || investor.country
                }
              </span>
            </div>
          )}

          {investor.expected_ticket_amount && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-2.5 w-2.5 flex-shrink-0 text-[#22C55E]" />
              <span className="text-[#22C55E] font-medium">
                {formatCurrency(investor.expected_ticket_amount, investor.expected_ticket_currency || 'USD')}
              </span>
            </div>
          )}

          {/* Relationship Intelligence Badges */}
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
              investor.relationship_strength === 'cold' ? 'bg-[#94A3B8]/10 text-[#94A3B8]' :
              investor.relationship_strength === 'warm' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
              investor.relationship_strength === 'direct' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
              'bg-[#EF4444]/10 text-[#EF4444]'
            }`}>
              {investor.relationship_strength === 'cold' ? 'Cold' :
               investor.relationship_strength === 'warm' ? 'Warm' :
               investor.relationship_strength === 'direct' ? 'Direct' : '?'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
              investor.decision_role === 'decision_maker' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
              investor.decision_role === 'influencer' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
              investor.decision_role === 'gatekeeper' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
              'bg-[#EF4444]/10 text-[#EF4444]'
            }`}>
              {investor.decision_role === 'decision_maker' ? 'DM' :
               investor.decision_role === 'influencer' ? 'Inf' :
               investor.decision_role === 'gatekeeper' ? 'GK' : '?'}
            </span>
          </div>

          {investor.alknz_point_of_contact_id && (
            <div className="flex items-center gap-1 text-[#00A3FF]">
              <User className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">
                {getTeamMemberName(investor.alknz_point_of_contact_id) || 'Assigned'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard card (original)
  return (
    <div
      onClick={onClick}
      className="bg-[#0A1628] border border-[#1A2744] rounded-lg p-3 cursor-pointer hover:border-[#0047AB] transition-colors group"
    >
      {/* Header with Avatar and Name */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-[#002D72] text-white text-xs">
            {getInitials(investor.investor_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate group-hover:text-[#00A3FF] transition-colors">
            {investor.investor_name}
          </p>
          <p className="text-[#94A3B8] text-xs truncate">
            {investor.investor_type || 'Individual'}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 text-xs">
        {/* Sector */}
        {investor.sector && (
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Briefcase className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{investor.sector}</span>
          </div>
        )}

        {/* Location */}
        {(investor.city || investor.country) && (
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {investor.city && investor.country 
                ? `${investor.city}, ${investor.country}`
                : investor.city || investor.country
              }
            </span>
          </div>
        )}

        {/* Expected Ticket Size */}
        {investor.expected_ticket_amount && (
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-[#22C55E]">
              {formatCurrency(investor.expected_ticket_amount, investor.expected_ticket_currency || 'USD')}
            </span>
          </div>
        )}

        {/* ALKNZ Point of Contact */}
        {investor.alknz_point_of_contact_id && (
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-[#00A3FF]">
              {getTeamMemberName(investor.alknz_point_of_contact_id) || 'Assigned'}
            </span>
          </div>
        )}
      </div>

      {/* Visual indicator for drag */}
      <div className="mt-3 pt-2 border-t border-[#1A2744]/50 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-[#475569] text-center">Click to view • Drag to move</p>
      </div>
    </div>
  );
};
