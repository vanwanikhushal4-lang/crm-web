import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchSalesPersonList, fetchInsideSalesList, fetchSalesPersonActivity, fetchMOMDetails, fetchTaskLogs, fetchCalls, fetchCompanies, fetchCustomers, fetchMeetingLogs } from '../../api/Admin/SalespersonApi';
import { User, Calendar, MapPin, Search, ChevronRight, Activity, Phone, CheckSquare, Users, ChevronLeft, CheckCircle2, Clock } from 'lucide-react';

export default function SalespersonActivity() {
  const [salespersons, setSalespersons] = useState([]);
  const [filteredSalespersons, setFilteredSalespersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [userMeetings, setUserMeetings] = useState([]);
  const [userMoms, setUserMoms] = useState([]);
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
      const [managerRes, insideSalesRes] = await Promise.all([
        fetchSalesPersonList().catch((error) => {
          console.error('Failed to load sales managers:', error);
          return [];
        }),
        fetchInsideSalesList().catch((error) => {
          console.error('Failed to load inside sales:', error);
          return [];
        })
      ]);
      const extractUsers = (response) => {
        const list = response?.data?.data || response?.data || response || [];
        return Array.isArray(list) ? list : [];
      };
      const managers = extractUsers(managerRes);
      const insideSales = extractUsers(insideSalesRes).map((user) => ({ ...user, teamType: 'Inside Sales' }));
      const usersById = new Map();
      [...managers, ...insideSales].forEach((user) => {
        const userId = user.id || user.userId || user.salesPersonId || user.salespersonId;
        if (userId != null && !usersById.has(String(userId))) usersById.set(String(userId), user);
      });
      const arr = Array.from(usersById.values());
      
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
    setUserMoms([]);
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
      const ownerIdOf = (record) => record.salesmanId || record.salesman_id || record.salesPersonId || record.salespersonId ||
        record.salesManagerId || record.userId || record.user_id || record.createdById || record.createdBy || record.created_by;
      setUserMoms(allMoms.filter(m => String(ownerIdOf(m)) === userId));
      const combinedMeetings = [...allMoms, ...allLogs];
      setUserMeetings(combinedMeetings.filter(m => String(ownerIdOf(m)) === userId));

      const allTasks = extract(taskRes);
      setUserTasks(allTasks.filter(t => {
        const ownerId = t.userId || t.user_id || t.assignedToId || t.assignedTo || t.salesman_id ||
          t.salesmanId || t.salesPersonId || t.salespersonId || t.salesManagerId || t.createdById || t.createdBy;
        return String(ownerId) === userId;
      }));

      const allCalls = extract(callRes);
      setUserCalls(allCalls.filter(c => {
        const ownerId = c.userId || c.user_id || c.assignedToId || c.assignedTo || c.salesman_id ||
          c.salesmanId || c.salesPersonId || c.salespersonId || c.salesManagerId || c.createdById || c.createdBy;
        return String(ownerId) === userId;
      }));

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

  const getRepRole = (user) => {
    if (!user) return 'Sales Manager';
    if (user.teamType === 'Inside Sales') return user.teamType;
    const userStr = JSON.stringify(user).toLowerCase();
    if (userStr.includes('outsider') || userStr.includes('outside') || user.isOutside || user.isOutsider) {
      return 'Outsider';
    }
    return 'Sales Manager';
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
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch(e) {}
    return null;
  };

  const parseLocalDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getMeetingDate = (meeting) => meeting.meetingDate || meeting.meeting_date || meeting.startTime ||
    meeting.start_time || meeting.scheduledDate || meeting.scheduled_date || meeting.createdDate || meeting.createdAt || meeting.date;
  const getMeetingEndDate = (meeting) => meeting.endTime || meeting.end_time || meeting.meetingEndTime || meeting.meeting_end_time;
  const getTaskDate = (task) => task.dueDate || task.due_date || task.taskDate || task.task_date || task.createdDate || task.createdAt || task.date || task.startTime || task.callTime || task.timestamp;
  const getCallDate = (call) => call.callDate || call.callTime || call.createdDate || call.createdAt || call.date || call.startTime || call.timestamp;
  const getActivityDate = (activity) => activity.date || activity.createdAt || activity.loginTime || activity.login_time || activity.checkInTime;

  const isMeetingCompleted = (meeting) => {
    const status = String(meeting.status || meeting.meetingStatus || meeting.meeting_status || meeting.momStatus || '').toLowerCase();
    if (meeting.isCompleted === true || meeting.completed === true || meeting.momCompleted === true ||
      ['completed', 'complete', 'done', 'closed'].includes(status)) return true;

    const meetingIds = [meeting.meetingId, meeting.meeting_id, meeting.plannedMeetingId, meeting.planned_meeting_id,
      meeting.meetingLogId, meeting.meeting_log_id, meeting.logId, meeting.id].map(value => String(value || '')).filter(Boolean);
    const companyName = String(meeting.companyName || meeting.name || meeting.customerName || '').trim().toLowerCase();
    return userMoms.some(mom => {
      const momIds = [mom.meetingId, mom.meeting_id, mom.plannedMeetingId, mom.planned_meeting_id,
        mom.meetingLogId, mom.meeting_log_id, mom.logId].map(value => String(value || '')).filter(Boolean);
      if (Array.isArray(mom.meetingIds)) momIds.push(...mom.meetingIds.map(String));
      if (meetingIds.some(id => momIds.includes(id))) return true;
      const momCompany = String(mom.companyName || mom.customerName || mom.name || '').trim().toLowerCase();
      return companyName && momCompany === companyName;
    });
  };

  const formatMeetingTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const adjustDate = (days) => {
    const d = parseLocalDate(selectedDateStr);
    d.setDate(d.getDate() + days);
    setSelectedDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  // Filter activities by date
  const filteredMeetings = useMemo(() => userMeetings.filter(m => getDateStr(getMeetingDate(m)) === selectedDateStr), [userMeetings, selectedDateStr]);
  const filteredTasks = useMemo(() => userTasks.filter(t => getDateStr(getTaskDate(t)) === selectedDateStr), [userTasks, selectedDateStr]);
  const filteredCalls = useMemo(() => userCalls.filter(c => getDateStr(getCallDate(c)) === selectedDateStr), [userCalls, selectedDateStr]);
  const filteredActivity = useMemo(() => userActivity.filter(a => getDateStr(getActivityDate(a)) === selectedDateStr), [userActivity, selectedDateStr]);

  const groupedMeetings = useMemo(() => {
    const groups = new Map();
    filteredMeetings.forEach((meeting, index) => {
      const customerId = meeting.customerId || meeting.customer_id || meeting.customerID || meeting.accountId ||
        meeting.account_id || meeting.idCustomer || meeting.customerMasterId || meeting.customer?.id || meeting.account?.id;
      const companyId = meeting.companyId || meeting.company_id || meeting.company?.id;
      const label = (customerId && customerMap[String(customerId)]) ||
        (companyId && companyMap[String(companyId)]) ||
        meeting.companyName || meeting.company_name || resolveEntityName(meeting);
      const groupKey = customerId
        ? `customer-${customerId}`
        : companyId
        ? `company-${companyId}`
        : `name-${String(label).trim().toLowerCase() || index}`;

      if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, label, entries: [] });
      groups.get(groupKey).entries.push(meeting);
    });
    return Array.from(groups.values());
  }, [filteredMeetings, customerMap, companyMap]);

  const activityCountsByDate = useMemo(() => {
    const counts = {};
    const addCounts = (records, getDate, type) => {
      records.forEach((record) => {
        const date = getDateStr(getDate(record));
        if (!date) return;
        counts[date] ||= { meetings: 0, tasks: 0, calls: 0, locations: 0 };
        counts[date][type] += 1;
      });
    };
    addCounts(userMeetings, getMeetingDate, 'meetings');
    addCounts(userTasks, getTaskDate, 'tasks');
    addCounts(userCalls, getCallDate, 'calls');
    addCounts(userActivity, getActivityDate, 'locations');
    return counts;
  }, [userMeetings, userTasks, userCalls, userActivity]);

  const hasNoActivity = filteredMeetings.length === 0 && filteredTasks.length === 0 && filteredCalls.length === 0 && filteredActivity.length === 0;

  const timelineDates = useMemo(() => {
    const dates = [];
    const selectedDate = parseLocalDate(selectedDateStr);
    for (let i = -30; i <= 30; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDateStr]);

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
    <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 min-h-[75vh]">
      
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'} font-mono`}>
                        ID: {user.id || user.userId}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        getRepRole(user) === 'Outsider' 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {getRepRole(user)}
                      </span>
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
      <div className="min-w-0 bg-[#0c1220] border border-white/5 rounded-2xl p-6 flex flex-col overflow-y-auto animate-fade">
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
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{getRepName(selectedUser)}'s Activity</h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    getRepRole(selectedUser) === 'Outsider' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {getRepRole(selectedUser)}
                  </span>
                </div>
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
                  const dStr = getDateStr(dateObj);
                  const isSelected = dStr === selectedDateStr;
                  const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                  const dateNum = dateObj.getDate();
                  const isToday = dStr === getDateStr(new Date());
                  const activityCounts = activityCountsByDate[dStr] || {};
                  const activityMarkers = [
                    { type: 'meetings', count: activityCounts.meetings, label: 'meetings', Icon: Users, color: 'text-amber-300' },
                    { type: 'tasks', count: activityCounts.tasks, label: 'tasks', Icon: CheckSquare, color: 'text-emerald-300' },
                    { type: 'calls', count: activityCounts.calls, label: 'calls', Icon: Phone, color: 'text-purple-300' },
                    { type: 'locations', count: activityCounts.locations, label: 'location logs', Icon: MapPin, color: 'text-sky-300' }
                  ].filter((item) => item.count > 0);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex min-h-19 flex-col items-center justify-center p-2 rounded-xl border cursor-pointer min-w-18 transition-all duration-200 shrink-0 ${
                        isSelected 
                          ? 'active bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 scale-105' 
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
                      <div className="mt-1 grid min-h-5 w-full grid-cols-2 auto-rows-2.5 justify-items-center gap-x-1">
                        {activityMarkers.map(({ type, count, label, Icon, color }) => (
                          <span key={type} title={`${count} ${label}`} aria-label={`${count} ${label}`} className={`flex items-center gap-0.5 text-[9px] leading-none ${color}`}>
                            <Icon className="h-2.5 w-2.5" />{count}
                          </span>
                        ))}
                      </div>
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
                <p className="text-slate-400 text-sm">No recorded activities for {parseLocalDate(selectedDateStr).toLocaleDateString()}.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Meetings */}
                {filteredMeetings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Meetings ({filteredMeetings.length})
                    </h3>
                    <div className="space-y-4">
                      {groupedMeetings.map((group) => (
                        <section key={group.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                            <div className="min-w-0">
                              <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Customer</span>
                              <span className="text-xs font-bold text-amber-100">{group.label}</span>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                              {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {group.entries.map((mom, idx) => (
                        <div key={mom.meetingId || mom.meetingLogId || mom.id || `${group.key}-${idx}`} className="bg-amber-500/10 border-l-4 border-amber-500 p-3.5 rounded-r-xl border-y border-r border-white/5 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-200 text-sm">{resolveEntityName(mom)}</div>
                              {(mom.contactPersonName || mom.contactPerson || mom.personName) && (
                                <div className="mt-0.5 text-xs text-slate-400">Contact: {mom.contactPersonName || mom.contactPerson || mom.personName}</div>
                              )}
                            </div>
                            {isMeetingCompleted(mom) ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Completed
                              </span>
                            ) : (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                                <Clock className="h-3 w-3" /> Pending MOM
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>{formatMeetingTime(getMeetingDate(mom)) || 'Time not set'}{formatMeetingTime(getMeetingEndDate(mom)) ? ` - ${formatMeetingTime(getMeetingEndDate(mom))}` : ''}</span>
                            {(mom.meetingType || mom.engagement_type || mom.engagementType) && <span>{mom.meetingType || mom.engagement_type || mom.engagementType}</span>}
                          </div>
                          {(mom.locationName || mom.location || mom.address) && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-400">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
                              <span>{mom.locationName || mom.location || mom.address}</span>
                            </div>
                          )}
                          {(mom.momDescription || mom.momDetails || mom.minutesOfMeeting || mom.notes || mom.description) && (
                            <p className="border-t border-white/5 pt-2 text-xs leading-relaxed text-slate-300">
                              {mom.momDescription || mom.momDetails || mom.minutesOfMeeting || mom.notes || mom.description}
                            </p>
                          )}
                          {!mom.contactPersonName && !mom.contactPerson && !mom.personName && !mom.locationName && !mom.location && !mom.address && !mom.momDescription && !mom.momDetails && !mom.minutesOfMeeting && !mom.notes && !mom.description && (
                            <p className="text-xs text-slate-500">No additional meeting details recorded.</p>
                          )}
                        </div>
                            ))}
                          </div>
                        </section>
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

