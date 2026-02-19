import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  UserCheck, 
  DollarSign, 
  Target, 
  Rocket,
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Globe,
  PieChart,
  Layers,
  CheckCircle2,
  XCircle,
  Timer,
  CalendarCheck,
  AlertOctagon,
  UserCog,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_URL = "https://cdn.prod.website-files.com/66c1ff66234911f96b0e0367/66d5ccad639d4c3a5079e64e_ALKNZ_Main%20logo.svg";

// Format currency for display
const formatCurrency = (amount) => {
  if (!amount || amount === 0) return '$0';
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
};

// Large KPI Card for State of Business metrics
const LargeKPICard = ({ icon: Icon, label, value, subtext, color, bgGradient, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="relative overflow-hidden border border-[#1A2744] rounded-2xl p-8 hover:border-[#0047AB]/50 transition-all duration-300 hover:scale-[1.02]"
    style={{
      background: bgGradient || 'linear-gradient(135deg, rgba(10, 22, 40, 0.9) 0%, rgba(2, 4, 10, 0.9) 100%)'
    }}
    data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    {/* Background glow effect */}
    <div 
      className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl"
      style={{ background: color }}
    />
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-xl ${color.includes('gradient') ? '' : `bg-gradient-to-br ${color}`}`}
          style={color.includes('gradient') ? { background: color } : {}}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <p className="text-[#94A3B8] text-sm font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-5xl font-bold text-white mb-2">{value}</p>
      {subtext && (
        <p className="text-[#475569] text-sm">{subtext}</p>
      )}
    </div>
  </motion.div>
);

// Small Stat Card for secondary metrics
const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="border border-[#1A2744] rounded-xl p-5 hover:border-[#0047AB]/50 transition-colors"
    style={{
      background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
    }}
    data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const { token, API_URL, user } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_funds: 0,
    total_investors: 0,
    active_users: 0,
    active_funds: 0,
    active_fund_managers: 0,
    total_deployed_capital: 0,
    total_potential_capital: 0,
    capital_in_final_stages: 0
  });
  const [fundPerformance, setFundPerformance] = useState([]);
  const [investorIntelligence, setInvestorIntelligence] = useState(null);
  const [executionHealth, setExecutionHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, perfRes, intelRes, healthRes] = await Promise.all([
          axios.get(`${API_URL}/api/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/api/dashboard/fund-performance`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/api/dashboard/investor-intelligence`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/api/dashboard/execution-health`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setStats(statsRes.data);
        setFundPerformance(perfRes.data.funds || []);
        setInvestorIntelligence(intelRes.data);
        setExecutionHealth(healthRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, API_URL]);

  // Export Dashboard as PDF
  const exportToPDF = useCallback(async () => {
    setExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      
      // Helper function to add new page if needed
      const checkNewPage = (requiredSpace) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };
      
      // Helper to get final Y position after table
      const getTableFinalY = () => {
        return pdf.lastAutoTable?.finalY || yPos + 30;
      };
      
      // Load and add logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = LOGO_URL;
        });
        
        // Create canvas to convert SVG to image
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0A1628';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(logoImg, 10, 5, 180, 50);
        const logoDataUrl = canvas.toDataURL('image/png');
        
        pdf.addImage(logoDataUrl, 'PNG', margin, yPos, 50, 15);
        yPos += 20;
      } catch (logoError) {
        // If logo fails, add text header instead
        pdf.setFontSize(20);
        pdf.setTextColor(0, 71, 171); // ALKNZ blue
        pdf.text('ALKNZ Ventures', margin, yPos + 10);
        yPos += 15;
      }
      
      // Report Title
      pdf.setFontSize(24);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Admin Dashboard Report', margin, yPos + 10);
      yPos += 15;
      
      // Report Date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const reportDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Generated: ${reportDate}`, margin, yPos + 5);
      pdf.text(`Generated by: ${user?.first_name} ${user?.last_name} (${user?.email})`, margin, yPos + 10);
      yPos += 20;
      
      // Divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // Section 1: State of Business KPIs
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('State of Business Overview', margin, yPos);
      yPos += 8;
      
      const kpiData = [
        ['Metric', 'Value'],
        ['Total Deployed Capital', formatCurrency(stats.total_deployed_capital)],
        ['Total Potential Capital', formatCurrency(stats.total_potential_capital)],
        ['Capital in Final Stages', formatCurrency(stats.capital_in_final_stages)],
        ['Active Fund Managers', stats.active_fund_managers.toString()],
        ['Total Users', stats.total_users.toString()],
        ['Active Users', stats.active_users.toString()],
        ['Total Funds', stats.total_funds.toString()],
        ['Total Investors', stats.total_investors.toString()]
      ];
      
      autoTable(pdf, {
        startY: yPos,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [0, 71, 171], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 10 }
      });
      
      yPos = getTableFinalY() + 15;
      
      // Section 2: Fund Performance
      checkNewPage(60);
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Fund Performance Snapshot', margin, yPos);
      yPos += 8;
      
      if (fundPerformance.length > 0) {
        const fundData = fundPerformance.map(fund => [
          fund.fund_name,
          fund.target_capital > 0 ? formatCurrency(fund.target_capital) : '—',
          formatCurrency(fund.deployed_capital),
          fund.target_capital > 0 ? `${fund.percent_of_goal.toFixed(0)}%` : '—',
          fund.capital_in_final_stages > 0 ? formatCurrency(fund.capital_in_final_stages) : '—',
          fund.active_investors.toString(),
          fund.average_investment_size > 0 ? formatCurrency(fund.average_investment_size) : '—',
          fund.alerts.length > 0 ? `${fund.alerts.length} alert(s)` : 'OK'
        ]);
        
        autoTable(pdf, {
          startY: yPos,
          head: [['Fund', 'Target', 'Deployed', '% Goal', 'Final', 'Investors', 'Avg Size', 'Status']],
          body: fundData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [0, 71, 171], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          columnStyles: {
            0: { cellWidth: 35 },
            7: { cellWidth: 20 }
          }
        });
        
        yPos = getTableFinalY() + 15;
      }
      
      // Section 3: Investor Intelligence
      checkNewPage(80);
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Investor Intelligence', margin, yPos);
      yPos += 8;
      
      if (investorIntelligence) {
        // Geography
        pdf.setFontSize(11);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Total Investors: ${investorIntelligence.total_investors}`, margin, yPos);
        yPos += 8;
        
        if (investorIntelligence.geography?.length > 0) {
          const geoData = investorIntelligence.geography.slice(0, 8).map(g => [
            g.country,
            g.count.toString(),
            g.capital > 0 ? formatCurrency(g.capital) : '—'
          ]);
          
          autoTable(pdf, {
            startY: yPos,
            head: [['Country', 'Investors', 'Capital']],
            body: geoData,
            margin: { left: margin, right: margin + 100 },
            headStyles: { fillColor: [139, 92, 246], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            tableWidth: 80
          });
          
          // Investor Types (side by side)
          if (investorIntelligence.investor_types?.length > 0) {
            const typeData = investorIntelligence.investor_types.slice(0, 6).map(t => [
              t.type,
              t.count.toString(),
              `${t.percentage}%`
            ]);
            
            autoTable(pdf, {
              startY: yPos,
              head: [['Type', 'Count', '%']],
              body: typeData,
              margin: { left: margin + 90, right: margin },
              headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 9 },
              bodyStyles: { fontSize: 9 },
              alternateRowStyles: { fillColor: [245, 247, 250] },
              tableWidth: 75
            });
          }
          
          yPos = Math.max(getTableFinalY(), yPos) + 15;
        }
        
        // Stage Distribution
        checkNewPage(50);
        if (investorIntelligence.stage_distribution?.length > 0) {
          const stageData = investorIntelligence.stage_distribution.map(s => [
            s.stage,
            s.count.toString(),
            `${s.percentage}%`
          ]);
          
          pdf.setFontSize(11);
          pdf.setTextColor(71, 85, 105);
          pdf.text('Stage Distribution:', margin, yPos);
          yPos += 5;
          
          autoTable(pdf, {
            startY: yPos,
            head: [['Pipeline Stage', 'Investors', '%']],
            body: stageData,
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 247, 250] }
          });
          
          yPos = getTableFinalY() + 15;
        }
      }
      
      // Section 4: Execution Health
      checkNewPage(60);
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Execution Health & Bottlenecks', margin, yPos);
      yPos += 8;
      
      if (executionHealth) {
        const healthData = [
          ['Metric', 'Value'],
          ['Overdue Tasks', executionHealth.overdue_tasks?.total?.toString() || '0'],
          ['High Priority Overdue', executionHealth.overdue_tasks?.by_priority?.high?.toString() || '0'],
          ['Avg Response Time', executionHealth.avg_response_time_days ? `${executionHealth.avg_response_time_days} days` : 'N/A'],
          ['Meetings Completed', executionHealth.meetings?.completed?.toString() || '0'],
          ['Active Managers', executionHealth.tasks_per_fund_manager?.length?.toString() || '0']
        ];
        
        autoTable(pdf, {
          startY: yPos,
          head: [healthData[0]],
          body: healthData.slice(1),
          margin: { left: margin, right: margin + 100 },
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          tableWidth: 80
        });
        
        yPos = getTableFinalY() + 10;
        
        // Tasks per Fund Manager
        if (executionHealth.tasks_per_fund_manager?.length > 0) {
          checkNewPage(40);
          pdf.setFontSize(11);
          pdf.setTextColor(71, 85, 105);
          pdf.text('Tasks per Fund Manager:', margin, yPos);
          yPos += 5;
          
          const fmData = executionHealth.tasks_per_fund_manager.map(fm => [
            fm.fund_manager,
            fm.total.toString(),
            fm.open.toString(),
            fm.completed.toString(),
            fm.overdue.toString()
          ]);
          
          autoTable(pdf, {
            startY: yPos,
            head: [['Fund Manager', 'Total', 'Open', 'Done', 'Overdue']],
            body: fmData,
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [0, 163, 255], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 247, 250] }
          });
          
          yPos = getTableFinalY() + 10;
        }
        
        // Bottlenecks
        if (executionHealth.bottlenecks?.length > 0) {
          checkNewPage(40);
          pdf.setFontSize(11);
          pdf.setTextColor(71, 85, 105);
          pdf.text('Bottlenecks:', margin, yPos);
          yPos += 5;
          
          const bottleneckData = executionHealth.bottlenecks.map(b => [
            b.category,
            b.task_count.toString(),
            b.capital_blocked > 0 ? formatCurrency(b.capital_blocked) : '—'
          ]);
          
          autoTable(pdf, {
            startY: yPos,
            head: [['Category', 'Tasks', 'Capital Blocked']],
            body: bottleneckData,
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 247, 250] }
          });
          
          yPos = getTableFinalY() + 10;
        }
      }
      
      // Footer on each page
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `ALKNZ Fund Management CRM - Confidential | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      // Save the PDF
      const fileName = `ALKNZ_Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [stats, fundPerformance, investorIntelligence, executionHealth, user]);

  const toggleAlerts = (fundId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [fundId]: !prev[fundId]
    }));
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getAlertBgColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const formatDaysSinceClose = (days) => {
    if (days === null || days === undefined) return 'No closes yet';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    if (days < 60) return '1 month ago';
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white"
          >
            Admin Dashboard
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#94A3B8] mt-1"
          >
            State of the Business Overview
          </motion.p>
        </div>
        
        {/* Export Button */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={exportToPDF}
          disabled={exporting || loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0047AB] to-[#0052CC] text-white font-medium hover:from-[#003d91] hover:to-[#0047AB] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0047AB]/20"
          data-testid="export-dashboard-btn"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </>
          )}
        </motion.button>
      </div>

      {/* State of Business - Large KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LargeKPICard
          icon={DollarSign}
          label="Total Deployed Capital"
          value={formatCurrency(stats.total_deployed_capital)}
          subtext="Closed investments across all funds"
          color="linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
          delay={0}
        />
        <LargeKPICard
          icon={Target}
          label="Total Potential Capital"
          value={formatCurrency(stats.total_potential_capital)}
          subtext="Pipeline-weighted opportunities"
          color="linear-gradient(135deg, #0047AB 0%, #0052CC 100%)"
          delay={0.1}
        />
        <LargeKPICard
          icon={Rocket}
          label="Capital in Final Stages"
          value={formatCurrency(stats.capital_in_final_stages)}
          subtext="Signing & near-close deals"
          color="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          delay={0.2}
        />
        <LargeKPICard
          icon={Activity}
          label="Active Fund Managers"
          value={stats.active_fund_managers}
          subtext="Currently active team members"
          color="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          delay={0.3}
        />
      </div>

      {/* Secondary Stats Grid */}
      <div>
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-semibold text-white mb-4"
        >
          Platform Metrics
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.total_users}
            color="bg-[#0047AB]"
            delay={0.5}
          />
          <StatCard
            icon={UserCheck}
            label="Active Users"
            value={stats.active_users}
            color="bg-[#22C55E]"
            delay={0.55}
          />
          <StatCard
            icon={Briefcase}
            label="Total Funds"
            value={stats.total_funds}
            color="bg-[#002D72]"
            delay={0.6}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Investors"
            value={stats.total_investors}
            color="bg-[#0052CC]"
            delay={0.65}
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fund Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="border border-[#1A2744] rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#00A3FF]" />
            Fund Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628]/50">
              <span className="text-[#94A3B8]">Active Funds</span>
              <span className="text-white font-semibold">{stats.active_funds}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628]/50">
              <span className="text-[#94A3B8]">Total Investors in Pipeline</span>
              <span className="text-white font-semibold">{stats.total_investors}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628]/50">
              <span className="text-[#94A3B8]">Avg. Capital per Fund</span>
              <span className="text-white font-semibold">
                {stats.active_funds > 0 
                  ? formatCurrency((stats.total_deployed_capital + stats.capital_in_final_stages) / stats.active_funds)
                  : '$0'
                }
              </span>
            </div>
          </div>
        </motion.div>

        {/* Team Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="border border-[#1A2744] rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#00A3FF]" />
            Team Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628]/50">
              <span className="text-[#94A3B8]">Active Fund Managers</span>
              <span className="text-white font-semibold">{stats.active_fund_managers}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628]/50">
              <span className="text-[#94A3B8]">Total Team Size</span>
              <span className="text-white font-semibold">{stats.total_users}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628]/50">
              <span className="text-[#94A3B8]">Investors per Manager</span>
              <span className="text-white font-semibold">
                {stats.active_fund_managers > 0 
                  ? Math.round(stats.total_investors / stats.active_fund_managers)
                  : 0
                }
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { 
            title: 'Pipeline Health', 
            items: [
              { label: 'Deployed', value: formatCurrency(stats.total_deployed_capital), color: 'text-green-400' },
              { label: 'Final Stages', value: formatCurrency(stats.capital_in_final_stages), color: 'text-yellow-400' },
              { label: 'Potential', value: formatCurrency(stats.total_potential_capital), color: 'text-blue-400' }
            ]
          },
          { 
            title: 'Conversion Rates', 
            items: [
              { label: 'Active Rate', value: `${stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0}%`, color: 'text-green-400' },
              { label: 'Fund Utilization', value: `${stats.total_funds > 0 ? Math.round((stats.active_funds / stats.total_funds) * 100) : 0}%`, color: 'text-blue-400' }
            ]
          },
          { 
            title: 'Capital Velocity', 
            items: [
              { label: 'Total Pipeline', value: formatCurrency(stats.total_deployed_capital + stats.capital_in_final_stages + stats.total_potential_capital), color: 'text-white' },
              { label: 'Close Rate', value: stats.total_potential_capital > 0 ? `${Math.round((stats.total_deployed_capital / (stats.total_deployed_capital + stats.total_potential_capital)) * 100)}%` : '0%', color: 'text-green-400' }
            ]
          }
        ].map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
            className="border border-[#1A2744] rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
            }}
          >
            <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">{section.title}</h3>
            <div className="space-y-3">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[#475569] text-sm">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Section 3: Fund Performance Snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="border border-[#1A2744] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.9) 0%, rgba(2, 4, 10, 0.9) 100%)'
        }}
        data-testid="fund-performance-snapshot"
      >
        {/* Section Header */}
        <div className="p-6 border-b border-[#1A2744]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0047AB] to-[#0052CC]">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Fund Performance Snapshot</h2>
              <p className="text-[#94A3B8] text-sm">Comparative analysis across all funds</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="fund-performance-table">
            <thead>
              <tr className="border-b border-[#1A2744]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Fund Name</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Target Capital</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Deployed Capital</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">% of Goal</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Final Stages</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Active Investors</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Avg. Investment</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Last Close</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {fundPerformance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-[#475569]">
                    No funds available
                  </td>
                </tr>
              ) : (
                fundPerformance.map((fund, index) => (
                  <React.Fragment key={fund.fund_id}>
                    <tr 
                      className={`border-b border-[#1A2744]/50 hover:bg-[#0A1628]/50 transition-colors ${
                        fund.alerts.length > 0 ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => fund.alerts.length > 0 && toggleAlerts(fund.fund_id)}
                      data-testid={`fund-row-${fund.fund_id}`}
                    >
                      {/* Fund Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${fund.status === 'Active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                          <span className="text-white font-medium">{fund.fund_name}</span>
                        </div>
                      </td>
                      
                      {/* Target Capital */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-[#94A3B8]">
                          {fund.target_capital > 0 ? formatCurrency(fund.target_capital) : '—'}
                        </span>
                      </td>
                      
                      {/* Deployed Capital */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-green-400 font-semibold">
                          {formatCurrency(fund.deployed_capital)}
                        </span>
                      </td>
                      
                      {/* % of Goal */}
                      <td className="px-4 py-4 text-center">
                        {fund.target_capital > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-semibold ${
                              fund.percent_of_goal >= 100 ? 'text-green-400' :
                              fund.percent_of_goal >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {fund.percent_of_goal.toFixed(0)}%
                            </span>
                            <div className="w-16 h-1.5 bg-[#1A2744] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  fund.percent_of_goal >= 100 ? 'bg-green-400' :
                                  fund.percent_of_goal >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${Math.min(fund.percent_of_goal, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#475569]">—</span>
                        )}
                      </td>
                      
                      {/* Capital in Final Stages */}
                      <td className="px-4 py-4 text-right">
                        <span className={fund.capital_in_final_stages > 0 ? 'text-yellow-400 font-medium' : 'text-[#475569]'}>
                          {fund.capital_in_final_stages > 0 ? formatCurrency(fund.capital_in_final_stages) : '—'}
                        </span>
                      </td>
                      
                      {/* Active Investors */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-semibold">{fund.active_investors}</span>
                          {(fund.investors_in_deployed > 0 || fund.investors_in_final > 0) && (
                            <span className="text-xs text-[#475569]">
                              {fund.investors_in_deployed} closed · {fund.investors_in_final} final
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Average Investment Size */}
                      <td className="px-4 py-4 text-right">
                        <span className={fund.average_investment_size > 0 ? 'text-[#94A3B8]' : 'text-[#475569]'}>
                          {fund.average_investment_size > 0 ? formatCurrency(fund.average_investment_size) : '—'}
                        </span>
                      </td>
                      
                      {/* Time Since Last Close */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#475569]" />
                          <span className={`text-sm ${
                            fund.days_since_last_close === null ? 'text-[#475569]' :
                            fund.days_since_last_close <= 7 ? 'text-green-400' :
                            fund.days_since_last_close <= 30 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {formatDaysSinceClose(fund.days_since_last_close)}
                          </span>
                        </div>
                      </td>
                      
                      {/* Alerts */}
                      <td className="px-4 py-4 text-center">
                        {fund.alerts.length > 0 ? (
                          <button 
                            className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-[#1A2744] hover:bg-[#1A2744]/80 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAlerts(fund.fund_id);
                            }}
                          >
                            {fund.alerts.some(a => a.severity === 'critical') ? (
                              <AlertCircle className="h-4 w-4 text-red-400" />
                            ) : fund.alerts.some(a => a.severity === 'warning') ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            ) : (
                              <Info className="h-4 w-4 text-blue-400" />
                            )}
                            <span className="text-xs text-[#94A3B8]">{fund.alerts.length}</span>
                            {expandedAlerts[fund.fund_id] ? (
                              <ChevronUp className="h-3 w-3 text-[#475569]" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-[#475569]" />
                            )}
                          </button>
                        ) : (
                          <span className="text-green-400 text-xs">✓ OK</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Alerts Row */}
                    {expandedAlerts[fund.fund_id] && fund.alerts.length > 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-3 bg-[#0A1628]/30">
                          <div className="flex flex-wrap gap-2">
                            {fund.alerts.map((alert, alertIdx) => (
                              <div 
                                key={alertIdx}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getAlertBgColor(alert.severity)}`}
                              >
                                {getAlertIcon(alert.severity)}
                                <span className="text-sm text-[#E2E8F0]">{alert.message}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {fundPerformance.length > 0 && (
          <div className="p-4 border-t border-[#1A2744] bg-[#0A1628]/30">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-6">
                <span className="text-[#475569]">
                  {fundPerformance.length} fund{fundPerformance.length !== 1 ? 's' : ''} total
                </span>
                <span className="text-[#475569]">
                  {fundPerformance.filter(f => f.alerts.length > 0).length} with alerts
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[#94A3B8]">On Track</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[#94A3B8]">Needs Attention</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[#94A3B8]">Critical</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Section 5: Investor Intelligence */}
      {investorIntelligence && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="border border-[#1A2744] rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.9) 0%, rgba(2, 4, 10, 0.9) 100%)'
          }}
          data-testid="investor-intelligence"
        >
          {/* Section Header */}
          <div className="p-6 border-b border-[#1A2744]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]">
                <PieChart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Investor Intelligence</h2>
                <p className="text-[#94A3B8] text-sm">Aggregated insights across {investorIntelligence.total_investors} investors</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Investor Geography */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30" data-testid="investor-geography">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-[#00A3FF]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Investor Geography</h3>
                </div>
                <div className="space-y-2">
                  {investorIntelligence.geography?.slice(0, 6).map((geo, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-[#94A3B8] text-sm">{geo.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{geo.count}</span>
                        <div className="w-16 h-1.5 bg-[#1A2744] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#00A3FF] rounded-full"
                            style={{ width: `${Math.min((geo.count / investorIntelligence.total_investors) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!investorIntelligence.geography || investorIntelligence.geography.length === 0) && (
                    <p className="text-[#475569] text-sm">No geography data available</p>
                  )}
                </div>
              </div>

              {/* Investor Type Distribution */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30" data-testid="investor-types">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-[#22C55E]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Investor Type</h3>
                </div>
                <div className="space-y-2">
                  {investorIntelligence.investor_types?.slice(0, 6).map((type, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-[#94A3B8] text-sm">{type.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#475569] text-xs">{type.percentage}%</span>
                        <span className="text-white font-medium w-8 text-right">{type.count}</span>
                      </div>
                    </div>
                  ))}
                  {(!investorIntelligence.investor_types || investorIntelligence.investor_types.length === 0) && (
                    <p className="text-[#475569] text-sm">No type data available</p>
                  )}
                </div>
              </div>

              {/* Avg Ticket by Type */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30" data-testid="avg-ticket-by-type">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-4 w-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Avg Ticket by Type</h3>
                </div>
                <div className="space-y-2">
                  {investorIntelligence.avg_ticket_by_type?.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-[#94A3B8] text-sm truncate max-w-[100px]">{item.type}</span>
                      <span className="text-green-400 font-medium">{formatCurrency(item.average_ticket)}</span>
                    </div>
                  ))}
                  {(!investorIntelligence.avg_ticket_by_type || investorIntelligence.avg_ticket_by_type.length === 0) && (
                    <p className="text-[#475569] text-sm">No ticket data available</p>
                  )}
                </div>
              </div>

              {/* Fit Score Distribution */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30" data-testid="fit-score-distribution">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-[#EC4899]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Relationship Strength</h3>
                </div>
                <div className="space-y-2">
                  {investorIntelligence.fit_score_distribution?.map((score, idx) => {
                    const colors = {
                      'Excellent': 'bg-green-500',
                      'Good': 'bg-blue-500',
                      'Fair': 'bg-yellow-500',
                      'Poor': 'bg-red-500',
                      'Unknown': 'bg-gray-500'
                    };
                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors[score.score] || 'bg-gray-500'}`} />
                          <span className="text-[#94A3B8] text-sm">{score.score}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#475569] text-xs">{score.percentage}%</span>
                          <span className="text-white font-medium w-8 text-right">{score.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stage Distribution */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30 lg:col-span-2" data-testid="stage-distribution">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-[#06B6D4]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Investor Stage Distribution</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {investorIntelligence.stage_distribution?.map((stage, idx) => {
                    const isDeployed = ['Money Transfer', 'Transfer Date'].includes(stage.stage);
                    const isFinal = ['Signing Contract', 'Signing Subscription', 'Letter for Capital Call'].includes(stage.stage);
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border ${
                          isDeployed ? 'border-green-500/30 bg-green-500/10' :
                          isFinal ? 'border-yellow-500/30 bg-yellow-500/10' :
                          'border-[#1A2744] bg-[#0A1628]/50'
                        }`}
                      >
                        <p className="text-xs text-[#94A3B8] truncate">{stage.stage}</p>
                        <p className={`text-lg font-bold ${
                          isDeployed ? 'text-green-400' :
                          isFinal ? 'text-yellow-400' :
                          'text-white'
                        }`}>{stage.count}</p>
                        <p className="text-xs text-[#475569]">{stage.percentage}%</p>
                      </div>
                    );
                  })}
                  {(!investorIntelligence.stage_distribution || investorIntelligence.stage_distribution.length === 0) && (
                    <p className="text-[#475569] text-sm col-span-4">No stage data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Section 6: Execution Health & Bottlenecks */}
      {executionHealth && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.6 }}
          className="border border-[#1A2744] rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.9) 0%, rgba(2, 4, 10, 0.9) 100%)'
          }}
          data-testid="execution-health"
        >
          {/* Section Header */}
          <div className="p-6 border-b border-[#1A2744]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706]">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Execution Health & Bottlenecks</h2>
                <p className="text-[#94A3B8] text-sm">Operational signals and team performance</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Overdue Tasks */}
              <div className="border border-[#1A2744] rounded-xl p-4 bg-[#0A1628]/30" data-testid="overdue-tasks">
                <div className="flex items-center gap-2 mb-2">
                  <AlertOctagon className={`h-4 w-4 ${executionHealth.overdue_tasks?.total > 0 ? 'text-red-400' : 'text-green-400'}`} />
                  <span className="text-xs text-[#94A3B8] uppercase">Overdue Tasks</span>
                </div>
                <p className={`text-3xl font-bold ${executionHealth.overdue_tasks?.total > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {executionHealth.overdue_tasks?.total || 0}
                </p>
                {executionHealth.overdue_tasks?.total > 0 && (
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-red-400">{executionHealth.overdue_tasks?.by_priority?.high || 0} high</span>
                    <span className="text-yellow-400">{executionHealth.overdue_tasks?.by_priority?.medium || 0} med</span>
                    <span className="text-blue-400">{executionHealth.overdue_tasks?.by_priority?.low || 0} low</span>
                  </div>
                )}
              </div>

              {/* Avg Response Time */}
              <div className="border border-[#1A2744] rounded-xl p-4 bg-[#0A1628]/30" data-testid="avg-response-time">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-[#06B6D4]" />
                  <span className="text-xs text-[#94A3B8] uppercase">Avg Response Time</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {executionHealth.avg_response_time_days !== null ? `${executionHealth.avg_response_time_days}d` : '—'}
                </p>
                <p className="text-xs text-[#475569] mt-1">Between follow-ups</p>
              </div>

              {/* Meetings Scheduled */}
              <div className="border border-[#1A2744] rounded-xl p-4 bg-[#0A1628]/30" data-testid="meetings-scheduled">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarCheck className="h-4 w-4 text-[#8B5CF6]" />
                  <span className="text-xs text-[#94A3B8] uppercase">Meetings</span>
                </div>
                <p className="text-3xl font-bold text-white">{executionHealth.meetings?.completed || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-[#475569]">of {executionHealth.meetings?.scheduled || 0} scheduled</span>
                  {executionHealth.meetings?.completion_rate > 0 && (
                    <span className={`text-xs font-medium ${
                      executionHealth.meetings?.completion_rate >= 70 ? 'text-green-400' :
                      executionHealth.meetings?.completion_rate >= 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      ({executionHealth.meetings?.completion_rate}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Active Fund Managers */}
              <div className="border border-[#1A2744] rounded-xl p-4 bg-[#0A1628]/30">
                <div className="flex items-center gap-2 mb-2">
                  <UserCog className="h-4 w-4 text-[#22C55E]" />
                  <span className="text-xs text-[#94A3B8] uppercase">Active Managers</span>
                </div>
                <p className="text-3xl font-bold text-white">{executionHealth.tasks_per_fund_manager?.length || 0}</p>
                <p className="text-xs text-[#475569] mt-1">With assigned tasks</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tasks per Fund Manager */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30" data-testid="tasks-per-fm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-[#00A3FF]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Tasks per Fund Manager</h3>
                </div>
                {executionHealth.tasks_per_fund_manager?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1A2744]">
                          <th className="text-left py-2 text-xs text-[#94A3B8] font-medium">Fund Manager</th>
                          <th className="text-center py-2 text-xs text-[#94A3B8] font-medium">Total</th>
                          <th className="text-center py-2 text-xs text-[#94A3B8] font-medium">Open</th>
                          <th className="text-center py-2 text-xs text-[#94A3B8] font-medium">Done</th>
                          <th className="text-center py-2 text-xs text-[#94A3B8] font-medium">Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executionHealth.tasks_per_fund_manager.map((fm, idx) => (
                          <tr key={idx} className="border-b border-[#1A2744]/50">
                            <td className="py-2 text-sm text-white">{fm.fund_manager}</td>
                            <td className="py-2 text-sm text-center text-[#94A3B8]">{fm.total}</td>
                            <td className="py-2 text-sm text-center text-blue-400">{fm.open}</td>
                            <td className="py-2 text-sm text-center text-green-400">{fm.completed}</td>
                            <td className="py-2 text-sm text-center">
                              <span className={fm.overdue > 0 ? 'text-red-400 font-medium' : 'text-[#475569]'}>
                                {fm.overdue}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[#475569] text-sm">No task data available</p>
                )}
              </div>

              {/* Bottlenecks by Category */}
              <div className="border border-[#1A2744] rounded-xl p-5 bg-[#0A1628]/30" data-testid="bottlenecks">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Bottlenecks by Category</h3>
                </div>
                {executionHealth.bottlenecks?.length > 0 ? (
                  <div className="space-y-3">
                    {executionHealth.bottlenecks.map((bottleneck, idx) => {
                      const colors = {
                        'Legal': 'bg-purple-500',
                        'IC': 'bg-blue-500',
                        'Documentation': 'bg-yellow-500',
                        'Compliance': 'bg-red-500',
                        'Other': 'bg-gray-500'
                      };
                      return (
                        <div key={idx} className="p-3 rounded-lg border border-[#1A2744] bg-[#0A1628]/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colors[bottleneck.category] || 'bg-gray-500'}`} />
                              <span className="text-white font-medium">{bottleneck.category}</span>
                            </div>
                            <span className="text-xs text-[#94A3B8] px-2 py-0.5 rounded-full bg-[#1A2744]">
                              {bottleneck.task_count} task{bottleneck.task_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {bottleneck.capital_blocked > 0 && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />
                              <span className="text-sm text-yellow-400">
                                {formatCurrency(bottleneck.capital_blocked)} capital blocked
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mb-2" />
                    <p className="text-green-400 font-medium">No Bottlenecks Detected</p>
                    <p className="text-[#475569] text-sm">Operations running smoothly</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
