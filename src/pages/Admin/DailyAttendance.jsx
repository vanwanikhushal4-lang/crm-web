import { useState, useEffect } from 'react';
import { fetchDailyReportByDate } from '../../api/Admin/SalesActivityDaily';
import { MapPin, Image as ImageIcon, Camera, ChevronLeft, ChevronRight, Calendar, RefreshCw, X } from 'lucide-react';

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
      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium max-w-[250px] transition-colors"
      title={address}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" /> 
      <span className="truncate">
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
      const res = await fetchDailyReportByDate(selectedDate);
      const list = res?.data?.data || res?.data || res || [];
      const arr = Array.isArray(list) ? list : [];
      setAttendanceData(arr);
    } catch (err) {
      console.error("Failed to load daily attendance report:", err);
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

  const formatTime = (timeVal) => {
    if (!timeVal) return null;
    try {
      const d = new Date(timeVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch (e) {}
    return String(timeVal);
  };

  return (
    <div className="space-y-6 animate-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Daily Attendance</h2>
          <p className="text-slate-400 text-sm">Live tracking of check-ins, locations, and selfies.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-[#0c1220] border border-white/10 rounded-xl p-1 shadow-sm">
            <button 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition" 
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="relative flex items-center px-2">
              <Calendar className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input 
                type="date" 
                className="bg-transparent border-none pl-8 pr-2 py-1 text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <button 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition" 
              onClick={handleNextDay}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button 
            className="px-4 py-2 bg-[#0c1220] hover:bg-slate-800 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition" 
            onClick={loadData}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-12 text-center flex items-center justify-center min-h-[350px]">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
            Loading attendance records...
          </div>
        </div>
      ) : error ? (
        <div className="bg-[#0c1220] border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition" 
            onClick={loadData}
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="bg-[#0c1220] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Sales Rep</th>
                  <th className="px-6 py-4">Check In Time</th>
                  <th className="px-6 py-4">Check In Location</th>
                  <th className="px-6 py-4">Selfie</th>
                  <th className="px-6 py-4">Check Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                      No attendance records found for this date.
                    </td>
                  </tr>
                ) : (
                  attendanceData.map((record, idx) => {
                    const fName = record?.firstname || record?.firstName || record?.first_name || '';
                    const lName = record?.lastname || record?.lastName || record?.last_name || '';
                    const repName = `${fName} ${lName}`.trim() || record?.email || record?.salesPersonName || record?.salespersonName || record?.username || record?.name || `Sales Rep ${idx + 1}`;
                    const repId = record?.userId || record?.salesPersonId || record?.salespersonId || record?.user_id || record?.id || '--';

                    const loginTime = record?.loginTime || record?.login_time || record?.checkInTime || record?.check_in_time || record?.checkinTime;
                    const loginLocation = record?.loginLocation || record?.login_location || record?.checkInLocation || record?.check_in_location || record?.checkinLocation || record?.location;
                    const photoUrl = record?.imagePath || record?.image_path || record?.selfie || record?.selfieUrl || record?.photo || record?.photoUrl;
                    const logoutTime = record?.logoutTime || record?.logout_time || record?.checkOutTime || record?.check_out_time || record?.checkoutTime;

                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-200">
                            {repName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                          {formatTime(loginTime) || <span className="text-slate-500">--</span>}
                        </td>
                        <td className="px-6 py-4">
                          {loginLocation ? (
                            <LocationLink location={loginLocation} />
                          ) : <span className="text-slate-500 text-xs">No GPS Data</span>}
                        </td>
                        <td className="px-6 py-4">
                          {photoUrl ? (
                            <button 
                              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition" 
                              onClick={() => openImage(photoUrl)}
                            >
                              <Camera className="h-3.5 w-3.5 text-blue-400" /> View Photo
                            </button>
                          ) : <span className="text-slate-500 text-xs">No Photo</span>}
                        </td>
                        <td className="px-6 py-4">
                          {logoutTime ? (
                            <span className="text-slate-300 font-mono text-xs">
                              {formatTime(logoutTime)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                              Still Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative bg-[#0c1220] border border-white/10 rounded-2xl p-3 max-w-2xl w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-3">
              <h4 className="text-sm font-semibold text-slate-200">Attendance Photo Verification</h4>
              <button 
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img 
              src={selectedImage} 
              alt="Attendance Selfie" 
              className="max-h-[75vh] w-full object-contain rounded-xl bg-black/50"
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = 'https://via.placeholder.com/400x600?text=Image+Not+Found+On+Server';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
