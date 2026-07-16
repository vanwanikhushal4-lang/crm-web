import { useNavigate } from 'react-router-dom';
import { Users, Map, BarChart3, LogOut, Search, Clock, CalendarDays, Menu, X } from 'lucide-react';
import { useState } from 'react';
import DailyAttendance from './Admin/DailyAttendance';
import SalespersonActivity from './Admin/SalespersonActivity';
import ChiefAdminLeadsDashboard from './Admin/ChiefAdminLeadsDashboard';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('attendance');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout" style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', position: 'relative' }}>
      
      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`flex-col glass-panel sidebar-layout ${isSidebarOpen ? 'open' : ''}`} style={{ width: '280px', padding: '24px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="title-gradient" style={{ fontSize: '24px' }}>Admin</h2>
          <button 
            className="mobile-header"
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-col gap-2" style={{ flex: 1 }}>
          <button className={`btn ${activeTab === 'overview' ? '' : 'btn-secondary'} justify-start`} style={{ width: '100%' }} onClick={() => {
            setActiveTab('overview');
            setIsSidebarOpen(false);
          }}>
            <BarChart3 size={18} /> Overview
          </button>
          <button className={`btn ${activeTab === 'tracking' ? '' : 'btn-secondary'} justify-start`} style={{ width: '100%' }} onClick={() => {
            setActiveTab('tracking');
            setIsSidebarOpen(false);
          }}>
            <Map size={18} /> Live Map Tracking
          </button>
          <button className={`btn ${activeTab === 'attendance' ? '' : 'btn-secondary'} justify-start`} style={{ width: '100%' }} onClick={() => {
            setActiveTab('attendance');
            setIsSidebarOpen(false);
          }}>
            <Clock size={18} /> Daily Attendance
          </button>
          <button className={`btn ${activeTab === 'sales-calendar' ? '' : 'btn-secondary'} justify-start`} style={{ width: '100%' }} onClick={() => {
            setActiveTab('sales-calendar');
            setIsSidebarOpen(false);
          }}>
            <CalendarDays size={18} />  Calendars
          </button>
          <button className={`btn ${activeTab === 'approvals' ? '' : 'btn-secondary'} justify-start`} style={{ width: '100%' }} onClick={() => {
            setActiveTab('approvals');
            setIsSidebarOpen(false);
          }}>
            <Users size={18} /> User Approvals
          </button>
        </div>

        <button className="btn btn-secondary justify-start" style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => {
          localStorage.clear();
          navigate('/login');
        }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-col content-layout" style={{ flex: 1, padding: '32px', overflowY: 'auto', overflowX: 'hidden' }}>
        
        {/* Mobile Header Bar */}
        <div className="mobile-header" style={{ 
          alignItems: 'center', 
          gap: '12px', 
          padding: '12px 16px', 
          background: 'rgba(30, 41, 59, 0.4)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <Menu size={20} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: '700', textTransform: 'capitalize', color: '#fff' }}>
            {activeTab === 'overview' ? 'Leads Pipeline Dashboard' : (activeTab === 'sales-calendar' ? 'Calendars' : activeTab.replace('-', ' '))}
          </span>
        </div>

        {activeTab === 'attendance' && <DailyAttendance />}
        
        {activeTab === 'sales-calendar' && <SalespersonActivity />}
        
        {activeTab === 'tracking' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 style={{ fontSize: '28px' }}>Live Field Tracking</h1>
              
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input type="text" className="input-field" placeholder="Search sales managers..." style={{ paddingLeft: '40px' }} />
              </div>
            </div>

            <div className="glass-panel animate-fade" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)' }}>
              <div className="flex-col items-center">
                <Map size={48} color="#3b82f6" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <p className="text-muted" style={{ fontSize: '16px' }}>Interactive Map Component will render here</p>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Tracking 12 active sales managers in the field</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'overview' && <ChiefAdminLeadsDashboard />}
        
        {activeTab === 'approvals' && (
           <div className="flex justify-center items-center h-full"><p className="text-muted">Pending User Approvals (Coming Soon)</p></div>
        )}
      </div>
    </div>
  );
}
