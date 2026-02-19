import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  ArrowUpRight,
  Target,
  Wallet,
  ExternalLink,
  Calendar,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '-';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
};

// Format large numbers compactly
const formatCompactCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '-';
  if (amount >= 1000000) {
    return `${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount, currency);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Get initials
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const CapitalOverview = ({
  fundId,
  fundName,
  token,
  API_URL,
  onViewInvestor
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMissingInvestors, setShowMissingInvestors] = useState(false);
  const [showMissingExpectedTicket, setShowMissingExpectedTicket] = useState(false);

  const fetchCapitalOverview = useCallback(async () => {
    if (!fundId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/funds/${fundId}/capital-overview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch capital overview:', error);
      toast.error('Failed to load capital overview');
    } finally {
      setLoading(false);
    }
  }, [fundId, token, API_URL]);

  useEffect(() => {
    fetchCapitalOverview();
  }, [fetchCapitalOverview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#94A3B8]">No data available</p>
      </div>
    );
  }

  const progressPercentage = data.progress_percentage || 0;

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="capital-overview">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Capital Overview</h1>
        <p className="text-[#94A3B8]">{fundName || data.fund_name} • Command Center</p>
      </div>

      {/* Main KPI Cards - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        
        {/* Deployed Capital - Left Card */}
        <div 
          className="rounded-xl p-5 border border-[#1A2744]"
          style={{ background: 'linear-gradient(135deg, rgba(0, 71, 171, 0.15) 0%, rgba(0, 82, 204, 0.08) 100%)' }}
          data-testid="deployed-capital-card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#0047AB]/20">
                <Wallet className="h-5 w-5 text-[#00A3FF]" />
              </div>
              <div>
                <p className="text-sm text-[#94A3B8] mb-0.5">Deployed Capital</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white" data-testid="deployed-capital-amount">
                    {formatCurrency(data.deployed_capital, data.fund_currency)}
                  </span>
                  {data.target_reached && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/20 text-[#22C55E]">
                      <ArrowUpRight className="h-3 w-3" />
                      <span className="text-xs font-medium">Target reached</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#94A3B8]">{data.deployed_investor_count} investors</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#94A3B8]">Progress to Target</span>
              <span className="text-xs text-white font-medium">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-[#1A2744] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(progressPercentage, 100)}%`,
                  background: data.target_reached 
                    ? 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)'
                    : 'linear-gradient(90deg, #0047AB 0%, #00A3FF 100%)'
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#475569]">
                {formatCompactCurrency(data.deployed_capital, data.fund_currency)} deployed
              </span>
              <span className="text-xs text-[#475569]">
                Target: {formatCompactCurrency(data.target_raise, data.fund_currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Potential Capital - Right Card */}
        <div 
          className="rounded-xl p-5 border border-[#1A2744]"
          style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(167, 139, 250, 0.06) 100%)' }}
          data-testid="potential-capital-card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#8B5CF6]/20">
                <TrendingUp className="h-5 w-5 text-[#A78BFA]" />
              </div>
              <div>
                <p className="text-sm text-[#94A3B8] mb-0.5">Potential Capital</p>
                <span className="text-2xl font-bold text-white" data-testid="potential-capital-amount">
                  {formatCurrency(data.potential_capital, data.fund_currency)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#94A3B8]">{data.potential_investor_count} investors</p>
            </div>
          </div>
          
          <p className="text-xs text-[#475569] mt-2">
            Expected tickets from investors in active pipeline stages
          </p>

          {/* Missing Expected Ticket Alert - Compact */}
          {data.missing_expected_ticket_count > 0 && (
            <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span className="text-xs text-[#F59E0B]">
                  {data.missing_expected_ticket_count} missing expected ticket
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMissingExpectedTicket(!showMissingExpectedTicket)}
                className="text-[#F59E0B] hover:bg-[#F59E0B]/10 h-6 px-2 text-xs"
                data-testid="show-missing-expected-ticket-btn"
              >
                {showMissingExpectedTicket ? 'Hide' : 'Fix'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Target & Date Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Target Amount Card */}
        <div 
          className="rounded-xl p-5 border border-[#1A2744]"
          style={{ background: 'rgba(2, 4, 10, 0.6)' }}
          data-testid="target-amount-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <Target className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Fund Target</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(data.target_raise, data.fund_currency)}
          </p>
          <p className="text-xs text-[#475569] mt-1">
            {data.target_raise > 0 
              ? `${formatCompactCurrency(data.target_raise - data.deployed_capital, data.fund_currency)} remaining`
              : 'No target set'
            }
          </p>
        </div>

        {/* Target Date Card */}
        {data.target_date && (
          <div 
            className="rounded-xl p-5 border border-[#1A2744]"
            style={{ background: 'rgba(2, 4, 10, 0.6)' }}
            data-testid="target-date-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-[#A78BFA]" />
                  <p className="text-sm text-[#94A3B8]">Target Date</p>
                </div>
                <p className="text-xl font-bold text-white">{formatDate(data.target_date)}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <Clock className="h-3.5 w-3.5 text-[#94A3B8]" />
                  <span className="text-xs text-[#94A3B8]">Days Left</span>
                </div>
                <p className={`text-2xl font-bold ${
                  data.days_remaining !== null && data.days_remaining < 0 
                    ? 'text-[#EF4444]' 
                    : data.days_remaining !== null && data.days_remaining <= 30 
                      ? 'text-[#F59E0B]' 
                      : 'text-white'
                }`}>
                  {data.days_remaining !== null 
                    ? data.days_remaining < 0 
                      ? `${Math.abs(data.days_remaining)} overdue`
                      : data.days_remaining
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Missing Expected Ticket Investors - Expandable */}
      {showMissingExpectedTicket && data.missing_expected_ticket_count > 0 && (
        <div 
          className="rounded-xl p-4 border border-[#F59E0B]/30 mb-6"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}
          data-testid="missing-expected-ticket-alert"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
            <div>
              <p className="text-sm font-medium text-[#F59E0B]">
                {data.missing_expected_ticket_count} investor{data.missing_expected_ticket_count > 1 ? 's' : ''} missing Expected Ticket Size
              </p>
              <p className="text-xs text-[#94A3B8]">
                Add expected ticket amounts to include in Potential Capital
              </p>
            </div>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.missing_expected_ticket_investors.map((investor) => (
              <div 
                key={investor.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#02040A]/60 border border-[#1A2744]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#8B5CF6] text-white text-xs">
                      {getInitials(investor.investor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-white">{investor.investor_name}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {investor.investor_type} • {investor.pipeline_stage}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewInvestor && onViewInvestor(investor)}
                  className="text-[#00A3FF] hover:bg-[#0047AB]/20"
                  data-testid={`fix-expected-ticket-${investor.id}`}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Fix
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Card for Missing Investment Sizes */}
      {data.missing_investment_size_count > 0 && (
        <div 
          className="rounded-xl p-4 border border-[#F59E0B]/30 mb-6"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}
          data-testid="missing-investment-alert"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F59E0B]/20">
                <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#F59E0B]">
                  {data.missing_investment_size_count} investor{data.missing_investment_size_count > 1 ? 's' : ''} missing Investment Size
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  These investors are in Money Transfer or Transfer Date stages but have no investment size recorded
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMissingInvestors(!showMissingInvestors)}
              className="text-[#F59E0B] hover:bg-[#F59E0B]/10"
              data-testid="show-missing-investors-btn"
            >
              {showMissingInvestors ? 'Hide' : 'View & Fix'}
            </Button>
          </div>

          {/* Expandable list of missing investors */}
          {showMissingInvestors && (
            <div className="mt-4 space-y-2">
              {data.missing_investment_size_investors.map((investor) => (
                <div 
                  key={investor.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#02040A]/60 border border-[#1A2744]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#0047AB] text-white text-xs">
                        {getInitials(investor.investor_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-white">{investor.investor_name}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {investor.investor_type} • {investor.pipeline_stage}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewInvestor && onViewInvestor(investor)}
                    className="text-[#00A3FF] hover:bg-[#0047AB]/20"
                    data-testid={`fix-investor-${investor.id}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Fix
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deployed Investors Section */}
      <div className="rounded-xl border border-[#1A2744] p-5" style={{ background: 'rgba(2, 4, 10, 0.6)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/20">
              <Users className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Deployed Investors</p>
              <p className="text-xs text-[#94A3B8]">
                Investors in Money Transfer or Transfer Date stages with recorded investment
              </p>
            </div>
          </div>
          <span className="text-sm text-[#94A3B8]">
            {data.deployed_investor_count} investor{data.deployed_investor_count !== 1 ? 's' : ''}
          </span>
        </div>

        {data.deployed_investors.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-10 w-10 text-[#475569] mx-auto mb-2" />
            <p className="text-[#94A3B8] text-sm">No deployed investments yet</p>
            <p className="text-[#475569] text-xs mt-1">
              Move investors to 'Money Transfer' or 'Transfer Date' stages and add their investment size
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.deployed_investors.map((investor) => (
              <div 
                key={investor.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#02040A]/40 hover:bg-[#0047AB]/10 transition-colors cursor-pointer"
                onClick={() => onViewInvestor && onViewInvestor(investor)}
                data-testid={`deployed-investor-${investor.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-[#0047AB] text-white text-sm">
                      {getInitials(investor.investor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">{investor.investor_name}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {investor.investor_type} • {investor.pipeline_stage}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#22C55E]">
                    {formatCurrency(investor.investment_size, investor.investment_size_currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">Total in Final Stages</p>
          <p className="text-lg font-bold text-white">{data.total_investors_in_deployed_stages}</p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">With Investment Size</p>
          <p className="text-lg font-bold text-[#22C55E]">{data.deployed_investor_count}</p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">Missing Data</p>
          <p className="text-lg font-bold text-[#F59E0B]">{data.missing_investment_size_count}</p>
        </div>
        <div className="rounded-lg p-4 border border-[#1A2744]" style={{ background: 'rgba(2, 4, 10, 0.4)' }}>
          <p className="text-xs text-[#94A3B8] mb-1">Avg. Investment</p>
          <p className="text-lg font-bold text-white">
            {data.deployed_investor_count > 0 
              ? formatCompactCurrency(data.deployed_capital / data.deployed_investor_count, data.fund_currency)
              : '-'
            }
          </p>
        </div>
      </div>
    </div>
  );
};
