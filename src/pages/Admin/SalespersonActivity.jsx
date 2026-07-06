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
    <div className="split-view" style={{ display: 'flex', gap: '24px', height: '100%', minHeight: '80vh' }}>
      
      {/* Left Column: User List */}
      <div className="flex-col glass-panel split-left" style={{ width: '320px', padding: '20px', overflowY: 'hidden' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} /> Sales Team
        </h2>
        
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search reps..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', padding: '8px 8px 8px 36px' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {isLoadingUsers ? (
            <div className="text-muted text-center mt-4">Loading users...</div>
          ) : filteredSalespersons.length === 0 ? (
            <div className="text-muted text-center mt-4">No users found.</div>
          ) : (
            <div className="flex-col gap-2">
              {filteredSalespersons.map((user, idx) => {
                const isSelected = selectedUser && (selectedUser.id === user.id);
                return (
                  <div 
                    key={user.id || idx}
                    onClick={() => handleSelectUser(user)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.5)' : 'transparent'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: isSelected ? '#60a5fa' : '#fff' }}>
                        {getRepName(user)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        ID: {user.id || user.userId}
                      </div>
                    </div>
                    <ChevronRight size={16} color={isSelected ? '#60a5fa' : '#64748b'} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Calendar / Activity History */}
      <div className="flex-col glass-panel animate-fade split-right" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {!selectedUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
            <Calendar size={64} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '20px' }}>Select a Sales Rep</h3>
            <p className="text-muted">Click on a name from the list to view their complete calendar of activities.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', color: '#60a5fa' }}>{getRepName(selectedUser)}'s Activity</h2>
                <p className="text-muted">Historical timeline of all daily logins and field activities.</p>
              </div>

              {/* Classic Date Selector as fallback/explicit picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => adjustDate(-1)}>
                  <ChevronLeft size={18} />
                </button>
                <input 
                  type="date" 
                  className="input-field"
                  style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                />
                <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => adjustDate(1)}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Timeline Strip */}
            <div className="mb-6 animate-slide-in stagger-1">
              <div className="timeline-strip hide-scrollbar" ref={timelineRef}>
                {timelineDates.map((dateObj, idx) => {
                  const dStr = dateObj.toISOString().split('T')[0];
                  const isSelected = dStr === selectedDateStr;
                  const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                  const dateNum = dateObj.getDate();
                  const isToday = dStr === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div 
                      key={idx} 
                      className={`timeline-item ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedDateStr(dStr)}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '600', opacity: isSelected ? 0.9 : 0.6, marginBottom: '4px' }}>
                        {isToday ? 'TODAY' : dayName}
                      </span>
                      <span style={{ fontSize: '22px', fontWeight: '700' }}>
                        {dateNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLoadingActivity ? (
              <div className="flex justify-center items-center" style={{ height: '200px' }}>
                <div className="text-muted">Fetching activity history...</div>
              </div>
            ) : hasNoActivity ? (
              <div className="flex-col items-center justify-center animate-slide-in stagger-2" style={{ padding: '48px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <Calendar size={32} color="#64748b" style={{ marginBottom: '12px' }} />
                <p className="text-muted">No activities found for {new Date(selectedDateStr).toLocaleDateString()}.</p>
              </div>
            ) : (
              <div className="flex-col gap-4">
                {/* Meetings */}
                {filteredMeetings.length > 0 && (
                  <div className="animate-slide-in stagger-2" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} color="#f59e0b" /> Meetings ({filteredMeetings.length})
                    </h3>
                    <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {filteredMeetings.map((mom, idx) => (
                        <div key={idx} style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                          <div style={{ fontWeight: '600' }}>{resolveEntityName(mom)}</div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            {mom.meetingDate ? new Date(mom.meetingDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time'} • {mom.meetingType || 'Meeting'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {filteredTasks.length > 0 && (
                  <div className="animate-slide-in stagger-3" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckSquare size={18} color="#10b981" /> Tasks ({filteredTasks.length})
                    </h3>
                    <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {filteredTasks.map((task, idx) => (
                        <div key={idx} style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                          <div style={{ fontWeight: '600' }}>{task.taskName || task.title || 'Untitled Task'}</div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            Status: {task.status || 'Pending'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calls */}
                {filteredCalls.length > 0 && (
                  <div className="animate-slide-in stagger-4" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={18} color="#8b5cf6" /> Calls ({filteredCalls.length})
                    </h3>
                    <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {filteredCalls.map((call, idx) => (
                        <div key={idx} style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                          <div style={{ fontWeight: '600' }}>{resolveEntityName(call)}</div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            {call.duration ? `${call.duration} mins` : 'Logged'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GPS / Check Ins */}
                {filteredActivity.length > 0 && (
                  <div className="animate-slide-in stagger-4">
                    <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                      <MapPin size={18} color="#3b82f6" /> Field Location Logs ({filteredActivity.length})
                    </h3>
                    {filteredActivity.map((activity, idx) => (
                      <div key={idx} style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        borderLeft: '4px solid #3b82f6', 
                        padding: '16px', 
                        borderRadius: '0 8px 8px 0',
                        marginBottom: '12px'
                      }}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '600' }}>
                              Active Duty
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Check In</div>
                            <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                              {activity.loginTime ? new Date(activity.loginTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                            </div>
                            {activity.loginLocation && (
                              <div className="flex items-start gap-2" style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                <MapPin size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>GPS: {activity.loginLocation}</span>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Check Out</div>
                            <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                              {activity.logoutTime ? new Date(activity.logoutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : <span style={{ color: '#fbbf24' }}>Still Working</span>}
                            </div>
                            {activity.logoutLocation && (
                              <div className="flex items-start gap-2" style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                <MapPin size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>GPS: {activity.logoutLocation}</span>
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
