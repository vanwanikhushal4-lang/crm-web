import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchSalesPersonList, fetchSalesPersonActivity, fetchMOMDetails, fetchTaskLogs, fetchCalls, fetchCompanies, fetchCustomers, fetchMeetingLogs } from '../../api/Admin/SalespersonApi';
import { User, Calendar, MapPin, Search, ChevronRight, Activity, Phone, CheckSquare, Users, ChevronLeft } from 'lucide-react';

export default function SalespersonActivity() {
  const [salespersons, setSalespersons] = useState([]);
  const [filteredSalespersons, setFilteredSalespersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [userMeetings, setUserMeetings] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [userCalls, setUserCalls] = useState([]);
  
  const [customerMap, setCustomerMap] = useState({});
  const [companyMap, setCompanyMap] = useState({});

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const timelineRef = useRef(null);

  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadUsers();
    loadLookups();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredSalespersons(
        salespersons.filter(user => 
          (user.firstName || user.firstname || user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.lastName || user.lastname || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredSalespersons(salespersons);
    }
  }, [searchQuery, salespersons]);

  const loadLookups = async () => {
    try {
      const [compRes, custRes] = await Promise.all([
        fetchCompanies().catch(() => null),
        fetchCustomers().catch(() => null)
      ]);
      const extract = (res) => {
        const d = res?.data?.data || res?.data || res || [];
        return Array.isArray(d) ? d : [];
      };
      
      const compMap = {};
      extract(compRes).forEach(c => {
        const id = String(c.id || c.companyId);
        if (id) compMap[id] = c.companyName || c.name || c.accountName;
      });
      setCompanyMap(compMap);

      const custMap = {};
      extract(custRes).forEach(c => {
        const id = String(c.id || c.customerId || c.customer_id);
        
        // Match mobile app logic for resolving company names for a customer
        const companyId = String(c.companyId || c.company_id || c.company?.id || c.companyDetails?.id || c.companyMaster?.id);
        const linkedCompanyName = companyId && compMap[companyId] ? compMap[companyId] : '';
        
        const directCompanyName = c.companyName || c.company_name || c.company || c.accountName || c.organizationName || c.businessName || c.customer?.companyName || c.account?.companyName || c.customerMaster?.companyName || c.companyMaster?.companyName;
        
        const customerName = c.customerName || c.customer_name;
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.contactPersonName || c.contactName || c.personName || c.repName;
        
        let resolvedName = linkedCompanyName || directCompanyName;
        if (!resolvedName && customerName && customerName.toLowerCase() !== fullName.toLowerCase()) {
          resolvedName = customerName;
        }
        if (!resolvedName) resolvedName = fullName;
        
        if (id && resolvedName) custMap[id] = resolvedName;
      });
      setCustomerMap(custMap);
    } catch(e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetchSalesPersonList();
      const list = res?.data?.data || res?.data || res || [];
      const arr = Array.isArray(list) ? list : [];
      
      const excludedIds = new Set([139, 141, 142, 148, 149, 151].map(String));
      const filteredArr = arr.filter(user => {
        const userId = String(user.id || user.userId || user.salesPersonId);
        return !excludedIds.has(userId);
      });

      setSalespersons(filteredArr);
      setFilteredSalespersons(filteredArr);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setIsLoadingActivity(true);
    setUserActivity([]);
    setUserMeetings([]);
    setUserTasks([]);
    setUserCalls([]);
    
    try {
      const userId = String(user.id || user.userId || user.salesPersonId);
      
      const [actRes, momRes, logRes, taskRes, callRes] = await Promise.all([
        fetchSalesPersonActivity(userId).catch(() => null),
        fetchMOMDetails().catch(() => null),
        fetchMeetingLogs().catch(() => null),
        fetchTaskLogs().catch(() => null),
        fetchCalls().catch(() => null)
      ]);

      const extract = (res) => {
        const d = res?.data?.data || res?.data || res || [];
        return Array.isArray(d) ? d : [];
      };

      setUserActivity(extract(actRes));
      
      const allMoms = extract(momRes);
      const allLogs = extract(logRes);
      const combinedMeetings = [...allMoms, ...allLogs];
      setUserMeetings(combinedMeetings.filter(m => 
        String(m.salesmanId || m.salesman_id || m.userId || m.user_id || m.createdById) === userId
      ));

      const allTasks = extract(taskRes);
      setUserTasks(allTasks.filter(t => 
        String(t.userId || t.user_id || t.assignedToId || t.salesman_id || t.salesmanId) === userId
      ));

      const allCalls = extract(callRes);
      setUserCalls(allCalls.filter(c => 
        String(c.userId || c.user_id || c.salesman_id || c.salesmanId) === userId
      ));

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const getRepName = (user) => {
    const fName = user?.firstname || user?.firstName || '';
    const lName = user?.lastname || user?.lastName || '';
    const constructedName = `${fName} ${lName}`.trim();
    
    const possibleNames = [
      constructedName,
      user?.name,
      user?.fullName,
      user?.salesPersonName,
      user?.userName,
      user?.username
    ];

    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim().length > 0 && !name.includes('@')) {
        return name.trim();
      }
    }

    return `Sales Rep ${user?.id || user?.userId || 'Unknown'}`;
  };

  const resolveEntityName = (item) => {
    const custId = item.customerId || item.customer_id || item.account_id || item.accountId || item.idCustomer || item.customerMasterId;
    const compId = item.companyId || item.company_id || item.account_id;

    if (item.customerName) return item.customerName;
    if (item.companyName) return item.companyName;
    
    if (custId && customerMap[String(custId)]) return customerMap[String(custId)];
    if (compId && companyMap[String(compId)]) return companyMap[String(compId)];
    
    return `Client #${custId || compId || 'Unknown'}`;
  };

  const getDateStr = (val) => {
    if (!val) return null;
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val.slice(0, 10);
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch(e) {}
    return null;
  };

  const adjustDate = (days) => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() + days);
    setSelectedDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  // Filter activities by date
  const filteredMeetings = useMemo(() => userMeetings.filter(m => getDateStr(m.meetingDate || m.createdAt || m.date) === selectedDateStr), [userMeetings, selectedDateStr]);
  const filteredTasks = useMemo(() => userTasks.filter(t => getDateStr(t.dueDate || t.createdAt || t.date) === selectedDateStr), [userTasks, selectedDateStr]);
  const filteredCalls = useMemo(() => userCalls.filter(c => getDateStr(c.callDate || c.createdAt || c.date) === selectedDateStr), [userCalls, selectedDateStr]);
  const filteredActivity = useMemo(() => userActivity.filter(a => getDateStr(a.date || a.createdAt || a.loginTime) === selectedDateStr), [userActivity, selectedDateStr]);

  const hasNoActivity = filteredMeetings.length === 0 && filteredTasks.length === 0 && filteredCalls.length === 0 && filteredActivity.length === 0;

  const timelineDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = -45; i <= 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  useEffect(() => {
    if (timelineRef.current && selectedUser) {
      const activeEl = timelineRef.current.querySelector('.active');
      if (activeEl) {
        // slight delay to ensure render is complete
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      }
    }
  }, [selectedDateStr, selectedUser]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[75vh]">
      
      {/* Left Column: User List */}
      <div className="w-full lg:w-80 bg-[#0c1220] border border-white/5 rounded-2xl p-5 shrink-0 flex flex-col h-[650px] lg:h-auto overflow-hidden">
        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-400" /> Sales Team
        </h2>
        
        <div className="relative mb-4">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition" 
            placeholder="Search sales reps..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {isLoadingUsers ? (
            <div className="text-slate-400 text-xs text-center py-6">Loading sales reps...</div>
          ) : filteredSalespersons.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-6">No matching reps found.</div>
          ) : (
            filteredSalespersons.map((user, idx) => {
              const isSelected = selectedUser && (selectedUser.id === user.id);
              return (
                <div 
                  key={user.id || idx}
                  onClick={() => handleSelectUser(user)}
                  className={`p-3.5 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500/30' 
                      : 'bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 border border-white/5'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {getRepName(user)}
                    </div>
                    <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'} font-mono`}>
                      ID: {user.id || user.userId}
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Calendar / Activity History */}
      <div className="flex-1 bg-[#0c1220] border border-white/5 rounded-2xl p-6 flex flex-col overflow-y-auto animate-fade">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-500 space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mb-2">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Select a Sales Representative</h3>
            <p className="text-xs text-slate-400 max-w-sm">Click on any sales team member from the left list to view their complete calendar of activities, meetings, tasks, and field logs.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">{getRepName(selectedUser)}'s Activity</h2>
                <p className="text-slate-400 text-xs mt-0.5">Historical timeline of daily logins, field logs, tasks & calls.</p>
              </div>

              {/* Date Selector controls */}
              <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-xl p-1">
                <button 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition" 
                  onClick={() => adjustDate(-1)}
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-slate-200 text-xs font-mono focus:outline-none px-2 cursor-pointer"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                />
                <button 
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition" 
                  onClick={() => adjustDate(1)}
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Timeline Strip */}
            <div className="mb-6 animate-slide-in stagger-1">
              <div className="timeline-strip hide-scrollbar flex gap-2 overflow-x-auto pb-2" ref={timelineRef}>
                {timelineDates.map((dateObj, idx) => {
                  const dStr = dateObj.toISOString().split('T')[0];
                  const isSelected = dStr === selectedDateStr;
                  const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                  const dateNum = dateObj.getDate();
                  const isToday = dStr === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer min-w-[64px] transition-all duration-200 shrink-0 ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 scale-105' 
                          : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                      onClick={() => setSelectedDateStr(dStr)}
                    >
                      <span className={`text-[10px] font-semibold tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {isToday ? 'TODAY' : dayName}
                      </span>
                      <span className="text-lg font-bold mt-0.5">
                        {dateNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLoadingActivity ? (
              <div className="flex justify-center items-center py-16 text-slate-400 text-xs">
                Fetching activity history...
              </div>
            ) : hasNoActivity ? (
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-12 text-center text-slate-500 space-y-2">
                <Calendar className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">No recorded activities for {new Date(selectedDateStr).toLocaleDateString()}.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Meetings */}
                {filteredMeetings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Meetings ({filteredMeetings.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredMeetings.map((mom, idx) => (
                        <div key={idx} className="bg-amber-500/10 border-l-4 border-amber-500 p-3.5 rounded-r-xl border-y border-r border-white/5 space-y-1">
                          <div className="font-semibold text-slate-200 text-sm">{resolveEntityName(mom)}</div>
                          <div className="text-xs text-slate-400">
                            {mom.meetingDate ? new Date(mom.meetingDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time'} • {mom.meetingType || 'Meeting'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {filteredTasks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" /> Tasks ({filteredTasks.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredTasks.map((task, idx) => (
                        <div key={idx} className="bg-emerald-500/10 border-l-4 border-emerald-500 p-3.5 rounded-r-xl border-y border-r border-white/5 space-y-1">
                          <div className="font-semibold text-slate-200 text-sm">{task.taskName || task.title || 'Untitled Task'}</div>
                          <div className="text-xs text-slate-400">
                            Status: {task.status || 'Pending'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calls */}
                {filteredCalls.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Calls ({filteredCalls.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredCalls.map((call, idx) => (
                        <div key={idx} className="bg-purple-500/10 border-l-4 border-purple-500 p-3.5 rounded-r-xl border-y border-r border-white/5 space-y-1">
                          <div className="font-semibold text-slate-200 text-sm">{resolveEntityName(call)}</div>
                          <div className="text-xs text-slate-400">
                            {call.duration ? `${call.duration} mins` : 'Logged'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GPS / Check Ins */}
                {filteredActivity.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Field Location Logs ({filteredActivity.length})
                    </h3>
                    {filteredActivity.map((activity, idx) => (
                      <div key={idx} className="bg-slate-900/60 border-l-4 border-blue-500 border-y border-r border-white/5 p-4 rounded-r-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            Active Duty
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                            <div className="text-[11px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Check In</div>
                            <div className="font-semibold text-slate-200 text-xs mb-1 font-mono">
                              {activity.loginTime ? new Date(activity.loginTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                            </div>
                            {activity.loginLocation && (
                              <div className="flex items-start gap-1.5 text-xs text-slate-400">
                                <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                                <span className="truncate">GPS: {activity.loginLocation}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                            <div className="text-[11px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Check Out</div>
                            <div className="font-semibold text-slate-200 text-xs mb-1 font-mono">
                              {activity.logoutTime ? new Date(activity.logoutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : <span className="text-amber-400 font-normal">Still Working</span>}
                            </div>
                            {activity.logoutLocation && (
                              <div className="flex items-start gap-1.5 text-xs text-slate-400">
                                <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                                <span className="truncate">GPS: {activity.logoutLocation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

