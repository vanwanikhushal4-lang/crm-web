import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  Search,
  UserPlus,
  LogOut,
  Menu,
  Activity,
  User,
  Share2,
  FileText,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

import bizdriveLogo from '../assets/BIZDRIVE-LOGO.png';
import { getAllUsers } from '../api/apiFunctions/Login/Login_api_function';

// Import modular subcomponents
import CommandCenter from '../components/SalesManager/CommandCenter';
import CalendarTab from '../components/SalesManager/CalendarTab';
import PipelineTab from '../components/SalesManager/PipelineTab';
import ContactsTab from '../components/SalesManager/ContactsTab';
import ShareContactTab from '../components/SalesManager/ShareContactTab';
import DssrTab from '../components/SalesManager/DssrTab';



export default function SalesManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('salesActiveTab') || 'pipeline';
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('salesActiveTab', tab);
  };

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || 'Sales Manager';
  });

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    if ((!storedName || storedName === 'Sales Manager') && userId) {
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
      }).catch(err => console.error("Error loading user name:", err));
    }
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Shared modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Shared database arrays (passed down as props to subcomponents)
  const [deals, setDeals] = useState([
    { id: 1, customerName: 'Cristiano Ronaldo', companyName: 'CR7 Enterprises', value: '1.2 Cr', stage: 'PROPOSAL' },
    { id: 2, customerName: 'New Animesh', companyName: 'Animesh Tech Corp', value: '< 1 Cr', stage: 'TECHNICAL DISCUSSION' },
    { id: 3, customerName: 'Hamster Hamsters', companyName: 'Hamtaro Global', value: '< 1 Cr', stage: 'TECHNICAL DISCUSSION' },
    { id: 4, customerName: 'Lionel Messi', companyName: 'Inter Miami Ltd', value: '2.5 Cr', stage: 'NEGOTIATION' },
  ]);

  const [itinerary, setItinerary] = useState([
    { id: 1, time: '11:17 AM', customerName: 'Customer 1', contactPerson: 'Gana singh', status: 'ACTIVE' },
    { id: 2, time: '02:30 PM', customerName: 'Client Tech Solutions', contactPerson: 'Rajesh Kumar', status: 'PENDING' },
    { id: 3, time: '04:45 PM', customerName: 'Apex Industries', contactPerson: 'Sneha Patel', status: 'PENDING' },
  ]);

  const [contacts, setContacts] = useState([
    { id: 1, name: 'Gana singh', company: 'Customer 1', phone: '+91 98765 43210', email: 'gana.singh@customer1.com', tag: 'Hot' },
    { id: 2, name: 'Rajesh Kumar', company: 'Client Tech Solutions', phone: '+91 91234 56789', email: 'rajesh@techsolutions.in', tag: 'Warm' },
    { id: 3, name: 'Sneha Patel', company: 'Apex Industries', phone: '+91 99887 76655', email: 'sneha@apexind.co.in', tag: 'Lead' },
    { id: 4, name: 'Animesh Sen', company: 'Animesh Tech Corp', phone: '+91 88776 65544', email: 'animesh@techcorp.com', tag: 'Hot' },
  ]);

  const [meetings, setMeetings] = useState([
    { id: 1, title: 'Introductory Call', customer: 'Hamtaro Global', time: '10:00 AM', date: '2026-07-06' },
    { id: 2, title: 'Technical Alignment', company: 'Animesh Tech Corp', time: '11:17 AM', date: '2026-07-06' },
    { id: 3, title: 'Proposal Discussion', company: 'CR7 Enterprises', time: '03:00 PM', date: '2026-07-07' },
  ]);

  const [newLead, setNewLead] = useState({ name: '', company: '', value: '', stage: 'Lead' });

  const handleAddLead = (e) => {
    e.preventDefault();
    if (newLead.name && newLead.company) {
      setDeals([
        {
          id: Date.now(),
          customerName: newLead.name,
          companyName: newLead.company,
          value: newLead.value || '< 1 Cr',
          stage: newLead.stage
        },
        ...deals
      ]);
      setNewLead({ name: '', company: '', value: '', stage: 'Lead' });
      setShowAddLeadModal(false);
    }
  };

  const navigationItems = [
    { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'shareContact', label: 'Share Contact', icon: Share2 },
  ];
  
  return (
    <div className="flex h-screen bg-[#070b13] text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`desktop-sidebar-nav hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0c1220] border-r border-white/5 p-6 justify-between shrink-0 transition-all duration-300 ease-in-out`}>
        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-white rounded-xl p-1">
                <img src={bizdriveLogo} alt="Biz Drive CRM Logo" className="h-full w-full object-contain" />
              </div>
              {!isSidebarCollapsed && (
                <div className="animate-fade">
                  <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Biz Drive CRM</h1>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Sales Portal</span>
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
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
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
                <p className="text-xs text-slate-500 truncate">Sales Manager</p>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/login')}
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
          className="mobile-sidebar-drawer fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade"
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <aside 
        className={`mobile-sidebar-drawer fixed inset-y-0 left-0 z-50 w-64 bg-[#0c1220] border-r border-white/5 p-6 flex flex-col justify-between lg:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-8">
          {/* Logo / Branding / Close */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-white rounded-xl p-1">
                <img src={bizdriveLogo} alt="Biz Drive CRM Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Biz Drive CRM</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Sales Portal</span>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
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
              <p className="text-xs text-slate-500 truncate">Sales Manager</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 hover:border-red-500/20 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 bg-[#070b13]/80 backdrop-blur-md border-b border-white/5 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Menu 
              onClick={() => setIsMobileMenuOpen(true)}
              className="mobile-menu-drawer-toggle h-5 w-5 text-slate-400 lg:hidden cursor-pointer hover:text-white transition" 
            />
            <h2 className="text-lg font-bold text-slate-100 capitalize">
              {activeTab === 'home' ? 'Command Center' : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input Bar */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-64 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            
            {/* Add User Plus Trigger */}
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="p-2 rounded-lg bg-slate-900/60 border border-white/5 text-slate-300 hover:text-white hover:border-blue-500/30 transition-all shadow-md flex items-center justify-center"
              title="Add New Lead"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            
            {/* Live Clock */}
            <div className="text-xs text-slate-400 bg-slate-900/40 border border-white/5 px-3 py-1.5 rounded-lg font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeTab === 'home' && (
            <CommandCenter
              deals={deals}
              itinerary={itinerary}
              setItinerary={setItinerary}
              setActiveTab={handleTabChange}
              setShowAddLeadModal={setShowAddLeadModal}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab
              meetings={meetings}
              setMeetings={setMeetings}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineTab
              deals={deals}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsTab
              contacts={contacts}
              setContacts={setContacts}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'shareContact' && (
            <ShareContactTab />
          )}

          {/* {activeTab === 'dssr' && (
            <DssrTab />
          )} */}

        </div>
      </main>

      {/* CREATE NEW LEAD/DEAL MODAL (SHARED) */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Add New Lead</h3>
              <button onClick={() => setShowAddLeadModal(false)} className="text-xs text-slate-400 hover:text-white">Close</button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cristiano Ronaldo"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. CR7 Enterprises"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Estimated Value</label>
                <input
                  type="text"
                  placeholder="e.g. 1.2 Cr or < 1 Cr"
                  value={newLead.value}
                  onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Pipeline Stage</label>
                <select
                  value={newLead.stage}
                  onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  <option value="Lead">Lead</option>
                  <option value="TECHNICAL DISCUSSION">Technical Discussion</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="NEGOTIATION">Negotiation</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/10 transition-all mt-2"
              >
                SAVE LEAD
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
