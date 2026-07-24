import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Map,
  BarChart3,
  LogOut,
  Search,
  Clock,
  CalendarDays,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  FileText
} from 'lucide-react';
import bizdriveLogo from '../assets/BIZDRIVE-LOGO.png';
import DailyAttendance from './Admin/DailyAttendance';
import SalespersonActivity from './Admin/SalespersonActivity';
import ChiefAdminLeadsDashboard from './Admin/ChiefAdminLeadsDashboard';
import DssrTab from './Admin/DssrTab';
import { getAllUsers } from '../api/apiFunctions/Login/Login_api_function';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'overview';
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('adminActiveTab', tab);
  };

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || 'Admin User';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // User details fetch
  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    if ((!storedName || storedName === 'Admin User' || storedName === 'Sales Manager') && userId) {
      getAllUsers().then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const current = arr.find(u => String(u.id || u.userId) === String(userId));
        if (current) {
          const first = String(current.firstName || current.firstname || current.first_name || '').trim();
          const last = String(current.lastName || current.lastname || current.last_name || '').trim();
          const fullName = `${first} ${last}`.trim() || current.name || current.username || current.email || '';
          if (fullName) {
            localStorage.setItem('userName', fullName);
            setUserName(fullName);
          }
        }
      }).catch(err => console.error("Error loading admin user name:", err));
    }
  }, []);

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'dssr', label: 'DSSR Activity', icon: FileText },
    { id: 'attendance', label: 'Daily Attendance', icon: Clock },
    { id: 'tracking', label: 'Live Map Tracking', icon: Map },
    { id: 'sales-calendar', label: 'Calendars', icon: CalendarDays },
    { id: 'approvals', label: 'User Approvals', icon: Users },
  ];

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'overview':
        return 'Overview Pipeline';
      case 'dssr':
        return 'DSSR Activity Logs & Analytics';
      case 'attendance':
        return 'Daily Attendance';
      case 'tracking':
        return 'Live Field Map Tracking';
      case 'sales-calendar':
        return 'Calendars & Sales Activity';
      case 'approvals':
        return 'User Approvals';
      default:
        return 'Admin Portal';
    }
  };

  return (
    <div className="flex h-screen bg-[#070b13] text-slate-100 font-sans overflow-hidden">

      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`desktop-sidebar-nav hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0c1220] border-r border-white/5 p-6 justify-between shrink-0 transition-all duration-300 ease-in-out`}>
        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-white rounded-xl p-1 shadow-md">
                <img src={bizdriveLogo} alt="Biz Drive CRM Logo" className="h-full w-full object-contain" />
              </div>
              {!isSidebarCollapsed && (
                <div className="animate-fade">
                  <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Biz Drive CRM</h1>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Admin Portal</span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Trigger */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!isSidebarCollapsed && <span className="animate-fade truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-2'}`}>
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden animate-fade">
                <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
                <p className="text-xs text-slate-500 truncate">Administrator</p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'px-0' : 'gap-2 px-4'} py-2.5 rounded-xl border border-white/5 hover:border-red-500/20 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300`}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span className="animate-fade">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE BACKDROP */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade"
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0c1220] border-r border-white/5 p-6 flex flex-col justify-between lg:hidden transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="space-y-8">
          {/* Logo / Branding / Close */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-white rounded-xl p-1 shadow-md">
                <img src={bizdriveLogo} alt="Biz Drive CRM Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Biz Drive CRM</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Admin Portal</span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 hover:border-red-500/20 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* TOP HEADER */}
        <header className="flex items-center justify-between px-6 py-4 bg-[#070b13]/80 backdrop-blur-md border-b border-white/5 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Menu
              onClick={() => setIsMobileMenuOpen(true)}
              className="h-5 w-5 text-slate-400 lg:hidden cursor-pointer hover:text-white transition"
            />
            <h2 className="text-lg font-bold text-slate-100 capitalize">
              {getTabTitle(activeTab)}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input Bar */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search managers, reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-64 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors text-slate-200 placeholder-slate-500"
              />
            </div>

            {/* Live Clock */}
            <div className="text-xs text-slate-400 bg-slate-900/40 border border-white/5 px-3 py-1.5 rounded-lg font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {activeTab === 'dssr' && <DssrTab />}

          {activeTab === 'attendance' && <DailyAttendance />}

          {activeTab === 'sales-calendar' && <SalespersonActivity />}

          {activeTab === 'tracking' && (
            <div className="space-y-6 animate-fade">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-100">Live Field Tracking</h1>
                  <p className="text-slate-400 text-sm">Real-time GPS tracking of active sales representatives</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2 bg-[#0c1220] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    placeholder="Search sales managers..."
                  />
                </div>
              </div>

              <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
                <div className="h-16 w-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <Map className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-1">Interactive Field Map</h3>
                <p className="text-slate-400 text-sm max-w-md mb-4">
                  Real-time live map tracking component will display live field locations and route breadcrumbs.
                </p>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  Tracking 12 Active Representatives
                </span>
              </div>
            </div>
          )}

          {activeTab === 'overview' && <ChiefAdminLeadsDashboard />}

          {activeTab === 'approvals' && (
            <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] animate-fade">
              <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-1">User Approvals</h3>
              <p className="text-slate-400 text-sm max-w-md">
                No pending user registration approvals found. New account requests will appear here.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

