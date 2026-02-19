import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Link2,
  LogOut,
  ChevronRight,
  Bell,
  UserCheck,
  Copy,
  Inbox,
  UserCircle2,
  MessageSquareDiff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LOGO_URL = "https://cdn.prod.website-files.com/66c1ff66234911f96b0e0367/66d5ccad639d4c3a5079e64e_ALKNZ_Main%20logo.svg";

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/funds', icon: Briefcase, label: 'Funds' },
  { path: '/admin/assignments', icon: Link2, label: 'Assignments' },
  { path: '/admin/all-investors', icon: UserCheck, label: 'All Investors' },
  { path: '/admin/duplicates', icon: Copy, label: 'Duplicates' },
  { path: '/admin/investor-requests', icon: Inbox, label: 'Requests' },
  { path: '/admin/personas', icon: UserCircle2, label: 'Personas' },
  { path: '/admin/feedback', icon: MessageSquareDiff, label: 'Feedback' },
];

const AdminLayout = () => {
  const { user, logout, API_URL } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen flex" data-testid="admin-layout"
      style={{
        background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)'
      }}
    >
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-[#1A2744] z-40 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #02040A 0%, #0A0A1F 100%)'
        }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#1A2744]">
          <img 
            src={LOGO_URL} 
            alt="ALKNZ Ventures" 
            className="h-8 w-auto"
            data-testid="sidebar-logo"
          />
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0047AB]/20 text-[#00A3FF] border-l-[3px] border-[#00A3FF]'
                    : 'text-[#94A3B8] hover:bg-[#0047AB]/10 hover:text-white'
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* User Section */}
        <div className="p-4 border-t border-[#1A2744]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0A1628]">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar_url ? `${API_URL}${user.avatar_url}` : undefined} />
              <AvatarFallback className="bg-[#0047AB] text-white text-sm">
                {getInitials(user?.first_name, user?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-[#94A3B8] truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 h-16 backdrop-blur-lg border-b border-[#1A2744] z-30 flex items-center justify-between px-6"
          style={{
            background: 'rgba(2, 4, 10, 0.7)'
          }}
        >
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <span>Admin Console</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Overview</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button 
              className="relative p-2 text-[#94A3B8] hover:text-white hover:bg-[#0047AB]/20 rounded-lg transition-colors"
              data-testid="notifications-button"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[#EF4444] rounded-full" />
            </button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0047AB]/20 transition-colors"
                  data-testid="user-menu-trigger"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url ? `${API_URL}${user.avatar_url}` : undefined} />
                    <AvatarFallback className="bg-[#0047AB] text-white text-xs">
                      {getInitials(user?.first_name, user?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8] rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-[#0A1628] border-[#1A2744]"
              >
                <DropdownMenuLabel className="text-white">
                  {user?.first_name} {user?.last_name}
                  <p className="text-xs font-normal text-[#94A3B8]">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#1A2744]" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-[#EF4444] focus:text-[#EF4444] focus:bg-[#EF4444]/10 cursor-pointer"
                  data-testid="logout-button"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
