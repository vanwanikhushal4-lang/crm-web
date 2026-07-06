import { useState, useEffect } from 'react';
import { fetchTodaysDailyReport } from '../../api/Admin/SalesActivityDaily';
import { MapPin, Image as ImageIcon, Camera, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const LocationLink = ({ location }) => {
  const [address, setAddress] = useState('Fetching...');

  useEffect(() => {
    let isMounted = true;
    if (!location || location === 'Location unavailable' || location.includes('null')) {
      if (isMounted) setAddress('Location unavailable');
      return;
    }
    
    const coords = location.split(',');
    const lat = coords[0]?.trim();
    const lng = coords[1]?.trim();

    if (!lat || !lng) {
       if (isMounted) setAddress('Invalid location data');
       return;
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    fetch(url, { headers: { 'User-Agent': 'VeloxCRMWeb/1.0' } })
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (data && data.address) {
            const a = data.address;
            const exactLocation = a.amenity || a.building || a.shop || a.road || a.pedestrian || '';
            const localArea = a.neighbourhood || a.suburb || a.village || '';
            const city = a.city || a.town || '';
            
            const parts = [exactLocation, localArea, city].filter(Boolean);
            const uniqueParts = [...new Set(parts)];
            
            let finalAddress = uniqueParts.length > 0 
              ? uniqueParts.join(', ') 
              : (data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : 'Unknown Address');

            setAddress(finalAddress);
          } else {
            setAddress('Address not found');
          }
        }
      })
      .catch(() => {
        if (isMounted) setAddress('Address unavailable');
      });

    return () => { isMounted = false; };
  }, [location]);

  return (
    <a 
      href={`https://www.google.com/maps/search/?api=1&query=${location}`} 
      target="_blank" 
      rel="noreferrer"
      className="flex items-center gap-2"
      style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '13px', maxWidth: '250px' }}
      title={address}
    >
      <MapPin size={14} style={{ flexShrink: 0 }} /> 
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {address}
      </span>
    </a>
  );
};

export default function DailyAttendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal states for images
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]); // Reload data when date changes

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTodaysDailyReport(selectedDate);
      const list = res?.data?.data || res?.data || res || [];
      const arr = Array.isArray(list) ? list : [];
      setAttendanceData(arr);
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const openImage = (url) => {
    if (url && typeof url === 'string' && url.length > 5) {
      setSelectedImage(url);
    } else {
      alert("No image available");
    }
  };

  return (
    <div className="animate-fade">
      <div className="flex justify-between items-center mb-6 header-actions">
        <div>
          <h2 style={{ fontSize: '24px', color: '#60a5fa' }}>Daily Attendance</h2>
          <p className="text-muted">Live tracking of check-ins, locations, and selfies.</p>
        </div>
        
        <div className="date-picker-group" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <button className="btn btn-secondary" style={{ padding: '8px', border: 'none' }} onClick={handlePrevDay}>
            <ChevronLeft size={18} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="date" 
              className="input-field"
              style={{ background: 'transparent', border: 'none', paddingLeft: '36px', color: '#fff', width: '150px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <button className="btn btn-secondary" style={{ padding: '8px', border: 'none' }} onClick={handleNextDay}>
            <ChevronRight size={18} />
          </button>
        </div>

        <button className="btn btn-secondary" onClick={loadData}>Refresh Data</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center" style={{ height: '400px' }}>
          <div className="text-muted">Loading attendance data...</div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '24px', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary mt-4" onClick={loadData}>Retry</button>
        </div>
      ) : (
        <div className="glass-panel responsive-table-wrapper" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '16px', fontWeight: '600' }}>Sales Rep</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Check In Time</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Check In Location</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Selfie</th>
              <th style={{ padding: '16px', fontWeight: '600' }}>Check Out Time</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No attendance records found for today.
                </td>
              </tr>
            ) : (
              attendanceData.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>
                      {(() => {
                        const fName = record?.firstname || record?.firstName || '';
                        const lName = record?.lastname || record?.lastName || '';
                        return `${fName} ${lName}`.trim() || record?.email || record?.salesPersonName || record?.username || `Sales Rep ${idx + 1}`;
                      })()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {record.userId || record.salesPersonId || record.id}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {record.loginTime ? new Date(record.loginTime).toLocaleTimeString() : <span className="text-muted">--</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {record.loginLocation ? (
                      <LocationLink location={record.loginLocation} />
                    ) : <span className="text-muted">No GPS Data</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {record.imagePath ? (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => openImage(record.imagePath)}
                      >
                        <Camera size={14} /> View Photo
                      </button>
                    ) : <span className="text-muted">No Photo</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString() : <span style={{ color: 'var(--danger)', fontSize: '13px' }}>Still Active</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }} onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', background: '#000', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <img 
              src={selectedImage} 
              alt="Attendance Selfie" 
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = 'https://via.placeholder.com/400x600?text=Image+Not+Found+On+Server';
              }}
            />
            <button 
              className="btn" 
              style={{ position: 'absolute', top: '-16px', right: '-16px', borderRadius: '50%', padding: '8px' }}
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
