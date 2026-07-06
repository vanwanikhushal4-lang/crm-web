import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Calendar, Clock, LogOut } from 'lucide-react';

export default function SalesManagerDashboard() {
  const navigate = useNavigate();
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <div className="container animate-fade">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="title-gradient" style={{ fontSize: '28px' }}>Sales Portal</h1>
          <p className="text-muted">Welcome back, Sales Manager</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/login')}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Attendance Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} color="#3b82f6" />
            <h2 style={{ fontSize: '20px' }}>Daily Attendance</h2>
          </div>
          
          <div className="flex-col gap-4">
            <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted">Status</span>
                <span style={{ color: checkedIn ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                  {checkedIn ? 'Checked In' : 'Pending'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Current Location: Fetching...</p>
            </div>

            {!checkedIn ? (
              <button className="btn" style={{ width: '100%', background: 'var(--success)' }} onClick={() => setCheckedIn(true)}>
                <Camera size={18} /> Punch In with Selfie
              </button>
            ) : (
              <button className="btn" style={{ width: '100%', background: 'var(--danger)' }} onClick={() => setCheckedIn(false)}>
                <MapPin size={18} /> Check Out
              </button>
            )}
          </div>
        </div>

        {/* Meetings / Leads */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} color="#3b82f6" />
            <h2 style={{ fontSize: '20px' }}>Today's Meetings</h2>
          </div>

          <div className="flex-col gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Client Tech Solutions Pvt Ltd</h3>
                    <p className="text-muted" style={{ fontSize: '13px' }}>10:30 AM • Mumbai</p>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
