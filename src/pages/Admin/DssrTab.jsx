import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Search,
  RefreshCw,
  Plus,
  TrendingUp,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  MapPin,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Filter,
  RotateCcw,
  Table,
  LayoutGrid,
  ChevronRight,
  ArrowUpRight,
  Building2,
  MessageSquare,
  Sparkles,
  CalendarDays,
  Activity,
  CheckSquare
} from 'lucide-react';

import {
  getCalls,
  getTaskLogs,
  getAllMeetingLogs,
  getAllUsers,
  getSalesManagers
} from '../../api/apiFunctions/Login/Login_api_function';

import RunningNumber from '../../components/common/RunningNumber';

// ==========================================
// REUSABLE MAPPER FUNCTIONS
// ==========================================

export const mapCallToCard = (item, userMap = {}, isTask = false) => {
  const rawDate = item.createdDate || item.date || item.createdAt || item.callTime || item.startTime || item.timestamp || '';
  const userIdStr = String(item.userId || item.createdById || item.salesManagerId || item.assignedTo || '');
  const repName = userMap[userIdStr] || item.userName || item.createdByName || item.salesManagerName || (userIdStr ? `Rep #${userIdStr}` : 'Sales Representative');

  const callType = (item.callType || item.type || (isTask ? 'TASK' : 'OUTGOING')).toUpperCase();
  const rawResult = (item.callResult || item.status || item.outcome || 'COMPLETED').toUpperCase();

  return {
    id: isTask ? `task_${item.id || Math.random()}` : `call_${item.id || Math.random()}`,
    rawId: item.id,
    category: isTask ? 'Task' : 'Call',
    subject: item.subject || item.taskName || item.title || (callType ? `${callType} Call` : 'Log Activity'),
    description: item.description || item.notes || item.remark || item.callResult || 'No detailed description provided.',
    callType,
    result: rawResult,
    accountName: item.accountName || item.companyName || item.customerName || item.relatedTo || 'General Corporate',
    contactPerson: item.contactPerson || item.personName || item.name || '',
    repName,
    userId: userIdStr,
    rawDate,
    formattedDate: rawDate ? new Date(rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
    formattedTime: rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  };
};

export const mapMeetingToCard = (item, userMap = {}) => {
  const rawDate = item.meetingDate || item.date || item.startTime || item.createdDate || '';
  const userIdStr = String(item.userId || item.salesManagerId || item.createdById || '');
  const repName = userMap[userIdStr] || item.userName || item.salesManagerName || (userIdStr ? `Rep #${userIdStr}` : 'Sales Representative');

  return {
    id: `meeting_${item.id || Math.random()}`,
    rawId: item.id,
    companyName: item.companyName || item.customerName || item.accountName || 'Client Account',
    contactPerson: item.contactPerson || item.name || '',
    location: item.locationName || item.address || item.location || 'Client Location',
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    momText: item.momDetails || item.minutesOfMeeting || item.notes || item.description || 'No MOM details entered.',
    repName,
    userId: userIdStr,
    rawDate,
    formattedDate: rawDate ? new Date(rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'
  };
};

// Date range matching helper
const matchesDateFilter = (rawDate, filterKey) => {
  if (filterKey === 'ALL' || !rawDate) return true;
  const itemDate = new Date(rawDate);
  if (isNaN(itemDate.getTime())) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filterKey === 'TODAY') {
    return itemDate >= today;
  }
  if (filterKey === 'YESTERDAY') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return itemDate >= yesterday && itemDate < today;
  }
  if (filterKey === 'THIS_WEEK') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return itemDate >= startOfWeek;
  }
  if (filterKey === 'THIS_MONTH') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return itemDate >= startOfMonth;
  }
  return true;
};

export default function DssrTab() {
  // Sub-sections: 'dashboard' | 'calls' | 'meetings'
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  // Raw API state
  const [rawCalls, setRawCalls] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);
  const [rawMeetings, setRawMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [userMap, setUserMap] = useState({});

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH'
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'grid' | 'table'

  // Focus Detail Modal State
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // ==========================================
  // PARALLEL DATA FETCHING WITH Promise.all
  // ==========================================
  const fetchAllDssrData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [callsRes, tasksRes, meetingsRes, usersRes, salesManagersRes] = await Promise.all([
        getCalls().catch((err) => { console.error('getCalls error', err); return []; }),
        getTaskLogs().catch((err) => { console.error('getTaskLogs error', err); return []; }),
        getAllMeetingLogs().catch((err) => { console.error('getAllMeetingLogs error', err); return []; }),
        getAllUsers().catch((err) => { console.error('getAllUsers error', err); return []; }),
        getSalesManagers().catch((err) => { console.error('getSalesManagers error', err); return []; })
      ]);

      const callsArr = Array.isArray(callsRes?.data) ? callsRes.data : Array.isArray(callsRes) ? callsRes : [];
      const tasksArr = Array.isArray(tasksRes?.data) ? tasksRes.data : Array.isArray(tasksRes) ? tasksRes : [];
      const meetingsArr = Array.isArray(meetingsRes?.data) ? meetingsRes.data : Array.isArray(meetingsRes) ? meetingsRes : [];
      const usersArr = Array.isArray(usersRes?.data) ? usersRes.data : Array.isArray(usersRes) ? usersRes : [];
      const salesManagersArr = Array.isArray(salesManagersRes?.data) ? salesManagersRes.data : Array.isArray(salesManagersRes) ? salesManagersRes : [];

      // Resolve user lookup map
      const map = {};
      usersArr.forEach((u) => {
        const id = String(u.id ?? u.userId ?? '');
        if (id) {
          const firstName = String(u.firstName || u.firstname || u.first_name || '').trim();
          const lastName = String(u.lastName || u.lastname || u.last_name || '').trim();
          const fullName = `${firstName} ${lastName}`.trim() || u.name || u.username || u.email || `User #${id}`;
          map[id] = fullName;
        }
      });
      salesManagersArr.forEach((m) => {
        const id = String(m.id ?? m.userId ?? '');
        if (id && !map[id]) {
          const firstName = String(m.firstName || m.firstname || m.first_name || '').trim();
          const lastName = String(m.lastName || m.lastname || m.last_name || '').trim();
          const fullName = `${firstName} ${lastName}`.trim() || m.name || m.username || m.email || `Manager #${id}`;
          map[id] = fullName;
        }
      });

      setRawCalls(callsArr);
      setRawTasks(tasksArr);
      setRawMeetings(meetingsArr);
      setUsers(usersArr);
      setSalesManagers(salesManagersArr);
      setUserMap(map);
    } catch (err) {
      console.error('Error fetching DSSR dataset:', err);
      setError('Failed to fetch DSSR data records. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDssrData();
  }, []);

  // ==========================================
  // TRANSFORMED & FILTERED DATA LISTS
  // ==========================================

  // Calls Cards ONLY
  const allCallCards = useMemo(() => {
    return rawCalls.map((c) => mapCallToCard(c, userMap, false));
  }, [rawCalls, userMap]);

  // Tasks Cards ONLY
  const allTaskCards = useMemo(() => {
    return rawTasks.map((t) => mapCallToCard(t, userMap, true));
  }, [rawTasks, userMap]);

  // Meeting Cards
  const allMeetingCards = useMemo(() => {
    return rawMeetings.map((m) => mapMeetingToCard(m, userMap));
  }, [rawMeetings, userMap]);

  // Filtered Calls list
  const filteredCallCards = useMemo(() => {
    return allCallCards.filter((card) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        card.subject.toLowerCase().includes(query) ||
        card.accountName.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        card.repName.toLowerCase().includes(query) ||
        card.callType.toLowerCase().includes(query);

      const matchesDate = matchesDateFilter(card.rawDate, dateFilter);
      const matchesUser = selectedUserFilter === 'ALL' || card.userId === String(selectedUserFilter);

      return matchesSearch && matchesDate && matchesUser;
    });
  }, [allCallCards, searchQuery, dateFilter, selectedUserFilter]);

  // Filtered Tasks list
  const filteredTaskCards = useMemo(() => {
    return allTaskCards.filter((card) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        card.subject.toLowerCase().includes(query) ||
        card.accountName.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        card.repName.toLowerCase().includes(query) ||
        card.callType.toLowerCase().includes(query);

      const matchesDate = matchesDateFilter(card.rawDate, dateFilter);
      const matchesUser = selectedUserFilter === 'ALL' || card.userId === String(selectedUserFilter);

      return matchesSearch && matchesDate && matchesUser;
    });
  }, [allTaskCards, searchQuery, dateFilter, selectedUserFilter]);

  // Filtered Meetings list
  const filteredMeetingCards = useMemo(() => {
    return allMeetingCards.filter((card) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        card.companyName.toLowerCase().includes(query) ||
        card.location.toLowerCase().includes(query) ||
        card.momText.toLowerCase().includes(query) ||
        card.repName.toLowerCase().includes(query);

      const matchesDate = matchesDateFilter(card.rawDate, dateFilter);
      const matchesUser = selectedUserFilter === 'ALL' || card.userId === String(selectedUserFilter);

      return matchesSearch && matchesDate && matchesUser;
    });
  }, [allMeetingCards, searchQuery, dateFilter, selectedUserFilter]);

  // Total Analytics Metrics
  const stats = useMemo(() => {
    const totalCalls = allCallCards.length;
    const totalTasks = allTaskCards.length;
    const totalMeetings = allMeetingCards.length;
    const totalEngagements = totalCalls + totalTasks + totalMeetings;

    const outgoingCalls = allCallCards.filter((c) => c.callType === 'OUTGOING').length;
    const incomingCalls = allCallCards.filter((c) => c.callType === 'INCOMING').length;
    const interestedCalls = allCallCards.filter((c) => c.result.includes('INTERESTED')).length;

    const activeRepsCount = new Set([
      ...allCallCards.map((c) => c.userId),
      ...allTaskCards.map((t) => t.userId),
      ...allMeetingCards.map((m) => m.userId)
    ].filter(Boolean)).size;

    return {
      totalEngagements,
      totalCalls,
      totalTasks,
      totalMeetings,
      activeRepsCount,
      outgoingCalls,
      incomingCalls,
      interestedCalls
    };
  }, [allCallCards, allTaskCards, allMeetingCards]);

  // Sales Rep Activity Leaderboard
  const repLeaderboard = useMemo(() => {
    const counts = {};
    allCallCards.forEach((c) => {
      const name = c.repName;
      if (!counts[name]) counts[name] = { calls: 0, tasks: 0, meetings: 0 };
      counts[name].calls += 1;
    });
    allTaskCards.forEach((t) => {
      const name = t.repName;
      if (!counts[name]) counts[name] = { calls: 0, tasks: 0, meetings: 0 };
      counts[name].tasks += 1;
    });
    allMeetingCards.forEach((m) => {
      const name = m.repName;
      if (!counts[name]) counts[name] = { calls: 0, tasks: 0, meetings: 0 };
      counts[name].meetings += 1;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        calls: data.calls,
        tasks: data.tasks,
        meetings: data.meetings,
        total: data.calls + data.tasks + data.meetings
      }))
      .sort((a, b) => b.total - a.total);
  }, [allCallCards, allTaskCards, allMeetingCards]);
  // Extracted list of Sales Managers for the filter dropdown
  const salesManagerOptions = useMemo(() => {
    const list = [];
    const seenIds = new Set();

    // 1. First add managers returned from getSalesManagers API
    salesManagers.forEach((m) => {
      const uid = String(m.id ?? m.userId ?? '');
      if (uid && !seenIds.has(uid)) {
        seenIds.add(uid);
        const firstName = String(m.firstName || m.firstname || m.first_name || '').trim();
        const lastName = String(m.lastName || m.lastname || m.last_name || '').trim();
        const fullName = `${firstName} ${lastName}`.trim() || m.name || m.userName || m.username || m.email || `Manager #${uid}`;
        list.push({ id: uid, name: fullName });
      }
    });

    // 2. Also check users array for any Sales Managers
    users.forEach((u) => {
      const uid = String(u.id ?? u.userId ?? '');
      const roleStr = String(u.role || u.roleName || u.designation || u.userRole || '').toLowerCase();
      if (uid && !seenIds.has(uid) && (roleStr.includes('manager') || roleStr.includes('sales') || salesManagers.length === 0)) {
        seenIds.add(uid);
        const name = userMap[uid] || u.name || `User #${uid}`;
        list.push({ id: uid, name });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [salesManagers, users, userMap]);

  const hasActiveFilters = searchQuery !== '' || dateFilter !== 'ALL' || selectedUserFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setDateFilter('ALL');
    setSelectedUserFilter('ALL');
  };

  return (
    <div className="space-y-6 text-slate-100 relative z-20 pb-20 animate-fade">

      {/* HEADER BAR & SUB-TAB TOGGLES */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#0b1628]/60 border border-white/5 p-5 rounded-2xl shadow-xl backdrop-blur-md">

        {/* Sub-tab navigation */}
        <div className="flex items-center bg-slate-900/80 p-1.5 rounded-2xl border border-white/5 gap-1 shadow-inner overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeSubTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calls')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeSubTab === 'calls'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <Phone className="h-4 w-4 text-emerald-400" />
            <span>All Calls</span>
            <span className="ml-1 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
              {allCallCards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeSubTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <CheckSquare className="h-4 w-4 text-amber-400" />
            <span>All Tasks</span>
            <span className="ml-1 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
              {allTaskCards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('meetings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeSubTab === 'meetings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>All Meetings</span>
            <span className="ml-1 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
              {allMeetingCards.length}
            </span>
          </button>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAllDssrData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-blue-500/30 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Refresh DSSR Datasets"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ERROR ALERT BANNER */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAllDssrData}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* FILTER BAR FOR CALLS, TASKS & MEETINGS */}
      {activeSubTab !== 'dashboard' && (
        <div className="flex flex-col gap-4 bg-[#0b1628]/40 border border-white/5 p-4.5 rounded-2xl shadow-lg animate-fade">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder={
                  activeSubTab === 'calls'
                    ? 'Search call logs, accounts, descriptions, sales manager...'
                    : activeSubTab === 'tasks'
                    ? 'Search task logs, subject, accounts, sales manager...'
                    : 'Search meeting logs, companies, locations, MOM details...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 shadow-inner"
              />
            </div>

            {/* View Mode & Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg text-xs font-semibold transition ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg text-xs font-semibold transition ${viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  title="Table View"
                >
                  <Table className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Toolbar Strip */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <Filter className="h-3.5 w-3.5 text-blue-400" />
                Filters:
              </span>

              {/* Date Filter Dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
              </select>

              {/* Sales Manager Dropdown Filter */}
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="ALL">All Sales Managers</option>
                {salesManagerOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Reset Filters button */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-semibold transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Filters
                </button>
              )}
            </div>

            <div className="text-slate-400 font-medium text-[11px] font-mono">
              Showing{' '}
              <strong className="text-white">
                {activeSubTab === 'calls' ? filteredCallCards.length : activeSubTab === 'tasks' ? filteredTaskCards.length : filteredMeetingCards.length}
              </strong>{' '}
              of {activeSubTab === 'calls' ? allCallCards.length : activeSubTab === 'tasks' ? allTaskCards.length : allMeetingCards.length} Records
            </div>
          </div>
        </div>
      )}

      {/* LOADING STATE SKELETON */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading DSSR Activity Datasets...</p>
        </div>
      )}

      {/* SECTION 1: DASHBOARD OVERVIEW */}
      {!isLoading && activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-fade">

          {/* Top Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Total Engagements */}
            <div className="bg-gradient-to-br from-[#0c1220] to-[#111a2e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Engagements</p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    <RunningNumber value={stats.totalEngagements} />
                  </h3>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-blue-400" />
                Calls, Tasks & Meeting Logs
              </p>
            </div>

            {/* Total Calls & Tasks */}
            <div className="bg-gradient-to-br from-[#0c1220] to-[#111a2e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calls & Tasks</p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    <RunningNumber value={stats.totalCalls} />
                  </h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Phone className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium flex items-center gap-1">
                <span className="text-emerald-400 font-bold">{stats.outgoingCalls}</span> Outgoing / {stats.incomingCalls} Incoming
              </p>
            </div>

            {/* Total Meetings */}
            <div className="bg-gradient-to-br from-[#0c1220] to-[#111a2e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logged Meetings</p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    <RunningNumber value={stats.totalMeetings} />
                  </h3>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-indigo-400" />
                Client Meeting Minutes
              </p>
            </div>

            {/* Active Representatives */}
            <div className="bg-linear-to-br from-[#0c1220] to-[#111a2e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Reps</p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    <RunningNumber value={stats.activeRepsCount} />
                  </h3>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium flex items-center gap-1">
                <User className="h-3 w-3 text-amber-400" />
                Team Members Logging Data
              </p>
            </div>

          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Sales Representatives Leaderboard */}
            <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <h3 className="font-bold text-slate-100 text-sm">Representative Activity Breakdown</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono font-semibold">Ranked by Logged Output</span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {repLeaderboard.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">No representative activity recorded yet.</div>
                ) : (
                  repLeaderboard.map((rep, idx) => (
                    <div
                      key={rep.name}
                      className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between hover:border-blue-500/20 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-200 text-xs">{rep.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {rep.calls} Calls/Tasks • {rep.meetings} Meetings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-full text-xs font-mono font-bold">
                          {rep.total} Total
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Activity Stream Highlights */}
            <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-bold text-slate-100 text-sm">Recent Activity Stream</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('calls')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {allCallCards.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemDetail(item)}
                    className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 flex items-start justify-between hover:border-indigo-500/25 transition cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg text-emerald-400 shrink-0 mt-0.5">
                        {item.callType === 'INCOMING' ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 text-xs">{item.subject}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.accountName}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">{item.repName} • {item.formattedDate}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 2: ALL CALLS & TASKS TAB */}
      {!isLoading && activeSubTab === 'calls' && (
        <div className="space-y-4 animate-fade">
          {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCallCards.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl bg-slate-950/10 space-y-2">
                  <Phone className="h-8 w-8 text-slate-600 mx-auto opacity-40" />
                  <p className="text-sm">No call or task logs match your search & filter criteria.</p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="text-xs text-blue-400 hover:underline font-semibold">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredCallCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedItemDetail(card)}
                    className="bg-[#0c1220]/60 border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-md"
                  >
                    <div>
                      {/* Upper badge row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {card.category} • {card.callType}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {card.result}
                        </span>
                      </div>

                      {/* Title & Account */}
                      <h4 className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition-colors line-clamp-1">
                        {card.subject}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{card.accountName}</span>
                      </p>

                      {/* Description snippet */}
                      <p className="text-xs text-slate-400 mt-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 line-clamp-2">
                        {card.description}
                      </p>
                    </div>

                    {/* Footer Rep info */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{card.repName}</span>
                      </span>
                      <span className="font-mono text-slate-500">{card.formattedDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Category & Subject</th>
                      <th className="py-3.5 px-5">Account / Client</th>
                      <th className="py-3.5 px-5">Call Result</th>
                      <th className="py-3.5 px-5">Sales Representative</th>
                      <th className="py-3.5 px-5">Date & Time</th>
                      <th className="py-3.5 px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    {filteredCallCards.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          No calls found.
                        </td>
                      </tr>
                    ) : (
                      filteredCallCards.map((card) => (
                        <tr key={card.id} className="hover:bg-slate-900/60 transition">
                          <td className="py-3.5 px-5 font-semibold">
                            <div>
                              <div className="text-slate-100 text-sm font-bold">{card.subject}</div>
                              <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                {card.category} • {card.callType}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">
                            {card.accountName}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {card.result}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">
                            {card.repName}
                          </td>
                          <td className="py-3.5 px-5 text-slate-400 font-mono">
                            {card.formattedDate} {card.formattedTime}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => setSelectedItemDetail(card)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ALL TASKS TAB */}
      {!isLoading && activeSubTab === 'tasks' && (
        <div className="space-y-4 animate-fade">
          {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTaskCards.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl bg-slate-950/10 space-y-2">
                  <CheckSquare className="h-8 w-8 text-slate-600 mx-auto opacity-40" />
                  <p className="text-sm">No task logs match your search & filter criteria.</p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="text-xs text-blue-400 hover:underline font-semibold">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredTaskCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedItemDetail(card)}
                    className="bg-[#0c1220]/60 border border-white/5 hover:border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-md"
                  >
                    <div>
                      {/* Upper badge row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          TASK LOG
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {card.result}
                        </span>
                      </div>

                      {/* Title & Account */}
                      <h4 className="font-bold text-slate-100 text-sm group-hover:text-amber-400 transition-colors line-clamp-1">
                        {card.subject}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{card.accountName}</span>
                      </p>

                      {/* Description snippet */}
                      <p className="text-xs text-slate-400 mt-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 line-clamp-2">
                        {card.description}
                      </p>
                    </div>

                    {/* Footer Rep info */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{card.repName}</span>
                      </span>
                      <span className="font-mono text-slate-500">{card.formattedDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Task & Subject</th>
                      <th className="py-3.5 px-5">Account / Client</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5">Sales Manager</th>
                      <th className="py-3.5 px-5">Date & Time</th>
                      <th className="py-3.5 px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    {filteredTaskCards.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          No task logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredTaskCards.map((card) => (
                        <tr key={card.id} className="hover:bg-slate-900/60 transition">
                          <td className="py-3.5 px-5 font-semibold">
                            <div>
                              <div className="text-slate-100 text-sm font-bold">{card.subject}</div>
                              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                TASK LOG
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">
                            {card.accountName}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {card.result}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">
                            {card.repName}
                          </td>
                          <td className="py-3.5 px-5 text-slate-400 font-mono">
                            {card.formattedDate} {card.formattedTime}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => setSelectedItemDetail(card)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: ALL MEETINGS TAB */}
      {!isLoading && activeSubTab === 'meetings' && (
        <div className="space-y-4 animate-fade">
          {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeetingCards.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl bg-slate-950/10 space-y-2">
                  <Calendar className="h-8 w-8 text-slate-600 mx-auto opacity-40" />
                  <p className="text-sm">No meeting logs match your search & filter criteria.</p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="text-xs text-blue-400 hover:underline font-semibold">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredMeetingCards.map((meeting) => (
                  <div
                    key={meeting.id}
                    onClick={() => setSelectedItemDetail(meeting)}
                    className="bg-[#0c1220]/60 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-md"
                  >
                    <div>
                      {/* Header Company */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          CLIENT MEETING
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{meeting.formattedDate}</span>
                      </div>

                      <h4 className="font-bold text-slate-100 text-sm group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {meeting.companyName}
                      </h4>

                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{meeting.location}</span>
                      </p>

                      {/* MOM Notes snippet */}
                      <p className="text-xs text-slate-400 mt-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 line-clamp-2">
                        {meeting.momText}
                      </p>
                    </div>

                    {/* Footer Rep info */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{meeting.repName}</span>
                      </span>
                      <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                        MOM Notes <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Company / Account</th>
                      <th className="py-3.5 px-5">Location</th>
                      <th className="py-3.5 px-5">Minutes of Meeting (MOM)</th>
                      <th className="py-3.5 px-5">Sales Representative</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    {filteredMeetingCards.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          No meeting logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredMeetingCards.map((meeting) => (
                        <tr key={meeting.id} className="hover:bg-slate-900/60 transition">
                          <td className="py-3.5 px-5 font-bold text-slate-100 text-sm">
                            {meeting.companyName}
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span>{meeting.location}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 truncate max-w-[250px]">
                            {meeting.momText}
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 font-medium">
                            {meeting.repName}
                          </td>
                          <td className="py-3.5 px-5 text-slate-400 font-mono">
                            {meeting.formattedDate}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => setSelectedItemDetail(meeting)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition"
                            >
                              View MOM
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL FOR CALL / MEETING DETAILS */}
      {selectedItemDetail && (
        <div
          onClick={() => setSelectedItemDetail(null)}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                  {selectedItemDetail.momText ? <Calendar className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {selectedItemDetail.subject || selectedItemDetail.companyName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Logged by {selectedItemDetail.repName} • {selectedItemDetail.formattedDate}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedItemDetail(null)} className="text-slate-400 hover:text-white font-bold text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-slate-500 text-[10px] font-semibold uppercase block">Account / Client</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block">
                    {selectedItemDetail.accountName || selectedItemDetail.companyName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-semibold uppercase block">Location / Type</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block">
                    {selectedItemDetail.location || selectedItemDetail.callType || 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold mb-1.5 block">Detailed Notes / Minutes of Meeting (MOM):</span>
                <p className="p-4 bg-slate-900/80 rounded-xl border border-white/5 text-slate-200 leading-relaxed font-sans text-xs whitespace-pre-wrap">
                  {selectedItemDetail.description || selectedItemDetail.momText}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
